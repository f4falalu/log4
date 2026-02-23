-- ============================================================================
-- Migration: Onboarding V2 RPC Updates
-- ============================================================================
-- Updates create_organization_with_admin to accept new org fields and
-- multi-country support. Adds save_onboarding_step for wizard resumability.
-- ============================================================================

-- =====================================================
-- 1. EXTENDED ORGANIZATION CREATION RPC
-- =====================================================

CREATE OR REPLACE FUNCTION create_organization_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_country_id UUID,
  p_operating_model TEXT DEFAULT NULL,
  p_primary_contact_name TEXT DEFAULT NULL,
  p_primary_contact_email TEXT DEFAULT NULL,
  p_primary_contact_phone TEXT DEFAULT NULL,
  -- New V2 parameters
  p_org_type TEXT DEFAULT NULL,
  p_sector TEXT DEFAULT NULL,
  p_fax TEXT DEFAULT NULL,
  p_country_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID := auth.uid();
  v_cid UUID;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create organization';
  END IF;

  -- Create workspace with organization details
  INSERT INTO workspaces (
    name,
    slug,
    country_id,
    created_by,
    operating_model,
    primary_contact_name,
    primary_contact_email,
    primary_contact_phone,
    org_type,
    sector,
    fax,
    org_status,
    onboarding_current_step,
    is_active
  )
  VALUES (
    p_name,
    p_slug,
    p_country_id,
    v_user_id,
    p_operating_model,
    COALESCE(p_primary_contact_name, (SELECT full_name FROM profiles WHERE id = v_user_id)),
    COALESCE(p_primary_contact_email, (SELECT email FROM auth.users WHERE id = v_user_id)),
    p_primary_contact_phone,
    p_org_type,
    p_sector,
    p_fax,
    'org_created',
    'team',  -- Next step after org creation
    TRUE
  )
  RETURNING id INTO v_workspace_id;

  -- Add creator as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- Assign system_admin role to creator (first admin is always system_admin)
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (v_user_id, 'system_admin', v_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update workspace status to admin_assigned
  UPDATE workspaces
  SET
    org_status = 'admin_assigned',
    first_admin_assigned_at = NOW()
  WHERE id = v_workspace_id;

  -- Initialize readiness record with admin gates satisfied
  INSERT INTO workspace_readiness (
    workspace_id,
    has_admin,
    has_rbac_configured,
    has_packaging_rules,
    admin_configured_at,
    rbac_configured_at
  )
  VALUES (
    v_workspace_id,
    TRUE,
    TRUE,
    EXISTS (SELECT 1 FROM packaging_slot_costs WHERE is_active = TRUE LIMIT 1),
    NOW(),
    NOW()
  );

  -- Update packaging_configured_at if rules exist
  UPDATE workspace_readiness
  SET packaging_configured_at = NOW()
  WHERE workspace_id = v_workspace_id AND has_packaging_rules = TRUE;

  -- Insert multi-country records
  IF p_country_ids IS NOT NULL AND array_length(p_country_ids, 1) > 0 THEN
    FOREACH v_cid IN ARRAY p_country_ids
    LOOP
      INSERT INTO workspace_countries (workspace_id, country_id, is_primary)
      VALUES (v_workspace_id, v_cid, v_cid = p_country_id)
      ON CONFLICT (workspace_id, country_id) DO NOTHING;
    END LOOP;
  ELSE
    -- If no country_ids array provided, insert the single primary country
    INSERT INTO workspace_countries (workspace_id, country_id, is_primary)
    VALUES (v_workspace_id, p_country_id, TRUE)
    ON CONFLICT (workspace_id, country_id) DO NOTHING;
  END IF;

  -- Update user profile status
  UPDATE profiles
  SET
    user_status = 'active',
    role_assigned_at = NOW(),
    activated_at = NOW(),
    onboarding_completed = FALSE
  WHERE id = v_user_id;

  RETURN v_workspace_id;
END;
$$;

-- =====================================================
-- 2. SAVE ONBOARDING STEP (for wizard resumability)
-- =====================================================

CREATE OR REPLACE FUNCTION save_onboarding_step(
  p_workspace_id UUID,
  p_step TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can update onboarding progress';
  END IF;

  UPDATE workspaces
  SET
    onboarding_current_step = p_step,
    updated_at = NOW()
  WHERE id = p_workspace_id;
END;
$$;

-- =====================================================
-- 3. COMPLETE ONBOARDING
-- =====================================================

CREATE OR REPLACE FUNCTION complete_onboarding(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = v_user_id
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can complete onboarding';
  END IF;

  -- Mark workspace onboarding as complete
  UPDATE workspaces
  SET
    onboarding_current_step = 'complete',
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_workspace_id;

  -- Mark user profile onboarding as complete
  UPDATE profiles
  SET
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Try to advance org status
  PERFORM advance_org_status(p_workspace_id);
END;
$$;

-- =====================================================
-- 4. SAVE WORKSPACE STATES
-- =====================================================

CREATE OR REPLACE FUNCTION save_workspace_states(
  p_workspace_id UUID,
  p_admin_unit_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aid UUID;
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can update workspace states';
  END IF;

  -- Clear existing states for this workspace
  DELETE FROM workspace_states WHERE workspace_id = p_workspace_id;

  -- Insert new states
  IF p_admin_unit_ids IS NOT NULL AND array_length(p_admin_unit_ids, 1) > 0 THEN
    FOREACH v_aid IN ARRAY p_admin_unit_ids
    LOOP
      INSERT INTO workspace_states (workspace_id, admin_unit_id)
      VALUES (p_workspace_id, v_aid)
      ON CONFLICT (workspace_id, admin_unit_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION save_onboarding_step TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION save_workspace_states TO authenticated;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Verify functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'save_onboarding_step'
  ) THEN
    RAISE EXCEPTION 'Migration failed: save_onboarding_step function not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'complete_onboarding'
  ) THEN
    RAISE EXCEPTION 'Migration failed: complete_onboarding function not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Onboarding V2 RPC Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Updated: create_organization_with_admin (new params: org_type, sector, fax, country_ids)';
  RAISE NOTICE 'Created: save_onboarding_step, complete_onboarding, save_workspace_states';
  RAISE NOTICE '=================================================================';
END $$;

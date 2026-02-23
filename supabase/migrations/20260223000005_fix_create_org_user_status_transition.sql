-- ============================================================================
-- Fix create_organization_with_admin: respect user_status state machine
-- ============================================================================
-- Issue: The RPC sets user_status directly to 'active', but a trigger enforces
-- the state machine: registered -> role_assigned -> active.
-- Fix: Transition through role_assigned first, then to active.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_organization_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_country_id UUID,
  p_operating_model TEXT DEFAULT NULL,
  p_primary_contact_name TEXT DEFAULT NULL,
  p_primary_contact_email TEXT DEFAULT NULL,
  p_primary_contact_phone TEXT DEFAULT NULL,
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
  v_system_admin_role_id UUID;
  v_cid UUID;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create organization';
  END IF;

  -- Look up the system_admin role ID
  SELECT id INTO v_system_admin_role_id
  FROM roles
  WHERE code = 'system_admin' AND is_system_role = TRUE
  LIMIT 1;

  IF v_system_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'System admin role not found in roles table';
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
    'team',
    TRUE
  )
  RETURNING id INTO v_workspace_id;

  -- Add creator as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- Assign system_admin role to creator with role_id
  INSERT INTO user_roles (user_id, role, role_id, assigned_by)
  VALUES (v_user_id, 'system_admin', v_system_admin_role_id, v_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Update workspace status to admin_assigned
  UPDATE workspaces
  SET
    org_status = 'admin_assigned',
    first_admin_assigned_at = NOW()
  WHERE id = v_workspace_id;

  -- Initialize readiness record with admin gates satisfied
  -- Uses ON CONFLICT because member_readiness_trigger on workspace_members
  -- may have already inserted a row for this workspace
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
  )
  ON CONFLICT (workspace_id) DO UPDATE SET
    has_admin = TRUE,
    has_rbac_configured = TRUE,
    has_packaging_rules = EXCLUDED.has_packaging_rules,
    admin_configured_at = COALESCE(workspace_readiness.admin_configured_at, NOW()),
    rbac_configured_at = COALESCE(workspace_readiness.rbac_configured_at, NOW());

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
    INSERT INTO workspace_countries (workspace_id, country_id, is_primary)
    VALUES (v_workspace_id, p_country_id, TRUE)
    ON CONFLICT (workspace_id, country_id) DO NOTHING;
  END IF;

  -- Update user profile status following the state machine:
  -- registered -> role_assigned -> active
  UPDATE profiles
  SET user_status = 'role_assigned'
  WHERE id = v_user_id AND user_status = 'registered';

  UPDATE profiles
  SET
    user_status = 'active',
    activated_at = NOW(),
    onboarding_completed = FALSE
  WHERE id = v_user_id AND user_status = 'role_assigned';

  RETURN v_workspace_id;
END;
$$;

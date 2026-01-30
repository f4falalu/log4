-- =====================================================
-- Migration: Onboarding RPC Functions
-- =====================================================
-- Creates server-side functions for onboarding workflows:
-- - Organization creation with auto-admin assignment
-- - Organization status advancement
-- - User invitation management
-- - Workspace readiness checks
-- =====================================================

-- =====================================================
-- 1. ORGANIZATION MANAGEMENT FUNCTIONS
-- =====================================================

-- Create organization with first admin (called during signup)
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_country_id UUID,
  p_operating_model TEXT DEFAULT NULL,
  p_primary_contact_name TEXT DEFAULT NULL,
  p_primary_contact_email TEXT DEFAULT NULL,
  p_primary_contact_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID := auth.uid();
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
    org_status,
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
    'org_created',
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

  -- Update workspace status to admin_assigned (bypassing state machine for initial creation)
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
    -- Check if packaging rules exist (should be seeded)
    EXISTS (SELECT 1 FROM packaging_slot_costs WHERE is_active = TRUE LIMIT 1),
    NOW(),
    NOW()
  );

  -- Update packaging_configured_at if rules exist
  UPDATE workspace_readiness
  SET packaging_configured_at = NOW()
  WHERE workspace_id = v_workspace_id AND has_packaging_rules = TRUE;

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

-- Advance organization status through the state machine
CREATE OR REPLACE FUNCTION advance_org_status(p_workspace_id UUID)
RETURNS org_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status org_status;
  v_new_status org_status;
  v_readiness RECORD;
  v_workspace RECORD;
BEGIN
  -- Get current workspace state
  SELECT * INTO v_workspace FROM workspaces WHERE id = p_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace not found: %', p_workspace_id;
  END IF;

  v_current_status := v_workspace.org_status;

  -- Get readiness state
  SELECT * INTO v_readiness FROM workspace_readiness WHERE workspace_id = p_workspace_id;

  -- Determine next valid status based on current state and conditions
  CASE v_current_status
    WHEN 'org_created' THEN
      IF v_readiness IS NOT NULL AND v_readiness.has_admin THEN
        v_new_status := 'admin_assigned';
      END IF;

    WHEN 'admin_assigned' THEN
      IF v_workspace.operating_model IS NOT NULL AND v_workspace.primary_contact_email IS NOT NULL THEN
        v_new_status := 'basic_config_complete';
      END IF;

    WHEN 'basic_config_complete' THEN
      IF v_readiness IS NOT NULL AND v_readiness.has_warehouse AND v_readiness.has_vehicle THEN
        v_new_status := 'operational_config_complete';
      END IF;

    WHEN 'operational_config_complete' THEN
      IF v_readiness IS NOT NULL AND v_readiness.is_ready THEN
        v_new_status := 'active';
      END IF;

    WHEN 'active' THEN
      -- Already at terminal state
      v_new_status := 'active';

    ELSE
      v_new_status := v_current_status;
  END CASE;

  -- Apply transition if valid
  IF v_new_status IS NOT NULL AND v_new_status != v_current_status THEN
    UPDATE workspaces
    SET org_status = v_new_status
    WHERE id = p_workspace_id;
  END IF;

  RETURN COALESCE(v_new_status, v_current_status);
END;
$$;

-- Update workspace basic config (operating model, contact)
CREATE OR REPLACE FUNCTION update_workspace_config(
  p_workspace_id UUID,
  p_operating_model TEXT DEFAULT NULL,
  p_primary_contact_name TEXT DEFAULT NULL,
  p_primary_contact_email TEXT DEFAULT NULL,
  p_primary_contact_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_new_status org_status;
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can update configuration';
  END IF;

  -- Update workspace
  UPDATE workspaces
  SET
    operating_model = COALESCE(p_operating_model, operating_model),
    primary_contact_name = COALESCE(p_primary_contact_name, primary_contact_name),
    primary_contact_email = COALESCE(p_primary_contact_email, primary_contact_email),
    primary_contact_phone = COALESCE(p_primary_contact_phone, primary_contact_phone),
    updated_at = NOW()
  WHERE id = p_workspace_id;

  -- Try to advance status
  v_new_status := advance_org_status(p_workspace_id);

  SELECT jsonb_build_object(
    'workspace_id', p_workspace_id,
    'org_status', v_new_status,
    'updated', TRUE
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. INVITATION MANAGEMENT FUNCTIONS
-- =====================================================

-- Send user invitation
CREATE OR REPLACE FUNCTION invite_user(
  p_email TEXT,
  p_workspace_id UUID,
  p_app_role app_role,
  p_workspace_role TEXT DEFAULT 'member',
  p_personal_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id UUID;
  v_inviter_id UUID := auth.uid();
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = v_inviter_id
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can invite users';
  END IF;

  -- Check if user already exists and is in workspace
  IF EXISTS (
    SELECT 1 FROM auth.users u
    JOIN workspace_members wm ON wm.user_id = u.id
    WHERE u.email = p_email AND wm.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'User with email % is already a member of this workspace', p_email;
  END IF;

  -- Expire any existing pending invitations for this email/workspace
  UPDATE user_invitations
  SET status = 'expired', expired_at = NOW(), updated_at = NOW()
  WHERE email = p_email
  AND workspace_id = p_workspace_id
  AND status = 'pending';

  -- Create new invitation
  INSERT INTO user_invitations (
    email,
    workspace_id,
    pre_assigned_role,
    workspace_role,
    invited_by,
    personal_message
  )
  VALUES (
    p_email,
    p_workspace_id,
    p_app_role,
    p_workspace_role,
    v_inviter_id,
    p_personal_message
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Revoke user invitation
CREATE OR REPLACE FUNCTION revoke_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Get workspace from invitation
  SELECT workspace_id INTO v_workspace_id
  FROM user_invitations
  WHERE id = p_invitation_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = v_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can revoke invitations';
  END IF;

  -- Revoke invitation
  UPDATE user_invitations
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_invitation_id;

  RETURN TRUE;
END;
$$;

-- Accept invitation (called after user registers or by existing user)
CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept invitation';
  END IF;

  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE invitation_token = p_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Verify email matches (if we can check)
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id AND email != v_invitation.email
  ) THEN
    RAISE EXCEPTION 'Invitation was sent to a different email address';
  END IF;

  -- Mark invitation as accepted
  UPDATE user_invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = v_user_id,
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.workspace_role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = v_invitation.workspace_role, updated_at = NOW();

  -- Assign application role
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (v_user_id, v_invitation.pre_assigned_role, v_invitation.invited_by)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update user profile status
  UPDATE profiles
  SET
    user_status = 'active',
    invited_by = v_invitation.invited_by,
    invited_at = v_invitation.invited_at,
    role_assigned_at = NOW(),
    activated_at = NOW()
  WHERE id = v_user_id;

  -- Build result
  SELECT jsonb_build_object(
    'invitation_id', v_invitation.id,
    'workspace_id', v_invitation.workspace_id,
    'workspace_name', (SELECT name FROM workspaces WHERE id = v_invitation.workspace_id),
    'app_role', v_invitation.pre_assigned_role,
    'workspace_role', v_invitation.workspace_role
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get invitation details by token (for signup page)
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ui.id,
    'email', ui.email,
    'workspace_id', ui.workspace_id,
    'workspace_name', w.name,
    'pre_assigned_role', ui.pre_assigned_role,
    'workspace_role', ui.workspace_role,
    'invited_by_name', p.full_name,
    'invited_at', ui.invited_at,
    'expires_at', ui.expires_at,
    'personal_message', ui.personal_message,
    'is_valid', (ui.status = 'pending' AND ui.expires_at > NOW())
  ) INTO v_result
  FROM user_invitations ui
  JOIN workspaces w ON w.id = ui.workspace_id
  LEFT JOIN profiles p ON p.id = ui.invited_by
  WHERE ui.invitation_token = p_token;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'error', 'Invitation not found');
  END IF;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 3. WORKSPACE READINESS FUNCTIONS
-- =====================================================

-- Get comprehensive workspace readiness status
CREATE OR REPLACE FUNCTION get_workspace_readiness(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'workspace_id', wr.workspace_id,
    'workspace_name', w.name,
    'org_status', w.org_status,
    'has_admin', wr.has_admin,
    'has_rbac_configured', wr.has_rbac_configured,
    'has_warehouse', wr.has_warehouse,
    'has_vehicle', wr.has_vehicle,
    'has_packaging_rules', wr.has_packaging_rules,
    'is_ready', wr.is_ready,
    'missing_items', ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT wr.has_admin THEN 'admin' END,
      CASE WHEN NOT wr.has_rbac_configured THEN 'rbac' END,
      CASE WHEN NOT wr.has_warehouse THEN 'warehouse' END,
      CASE WHEN NOT wr.has_vehicle THEN 'vehicle' END,
      CASE WHEN NOT wr.has_packaging_rules THEN 'packaging_rules' END
    ], NULL),
    'progress_percentage', (
      (CASE WHEN wr.has_admin THEN 1 ELSE 0 END) +
      (CASE WHEN wr.has_rbac_configured THEN 1 ELSE 0 END) +
      (CASE WHEN wr.has_warehouse THEN 1 ELSE 0 END) +
      (CASE WHEN wr.has_vehicle THEN 1 ELSE 0 END) +
      (CASE WHEN wr.has_packaging_rules THEN 1 ELSE 0 END)
    ) * 20,
    'timestamps', jsonb_build_object(
      'admin_configured_at', wr.admin_configured_at,
      'first_warehouse_at', wr.first_warehouse_at,
      'first_vehicle_at', wr.first_vehicle_at,
      'packaging_configured_at', wr.packaging_configured_at,
      'became_ready_at', wr.became_ready_at
    )
  ) INTO v_result
  FROM workspace_readiness wr
  JOIN workspaces w ON w.id = wr.workspace_id
  WHERE wr.workspace_id = p_workspace_id;

  IF v_result IS NULL THEN
    -- Return default response if no readiness record exists
    RETURN jsonb_build_object(
      'workspace_id', p_workspace_id,
      'is_ready', FALSE,
      'missing_items', ARRAY['admin', 'rbac', 'warehouse', 'vehicle', 'packaging_rules'],
      'progress_percentage', 0
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Check if user can access planning features for a workspace
CREATE OR REPLACE FUNCTION can_access_planning(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_ready FROM workspace_readiness WHERE workspace_id = p_workspace_id),
    FALSE
  );
$$;

-- Get user's onboarding status
CREATE OR REPLACE FUNCTION get_user_onboarding_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p.id,
    'user_status', p.user_status,
    'onboarding_completed', p.onboarding_completed,
    'has_workspace', EXISTS (SELECT 1 FROM workspace_members WHERE user_id = p.id),
    'has_role', EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id),
    'workspaces', (
      SELECT jsonb_agg(jsonb_build_object(
        'workspace_id', wm.workspace_id,
        'workspace_name', w.name,
        'workspace_role', wm.role,
        'org_status', w.org_status,
        'is_ready', COALESCE(wr.is_ready, FALSE)
      ))
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      LEFT JOIN workspace_readiness wr ON wr.workspace_id = w.id
      WHERE wm.user_id = p.id
    )
  ) INTO v_result
  FROM profiles p
  WHERE p.id = v_user_id;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION advance_org_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_workspace_config TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_readiness TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_planning TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_status TO authenticated;

-- Allow anon to check invitation validity (for signup page)
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO anon;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_organization_with_admin',
    'advance_org_status',
    'update_workspace_config',
    'invite_user',
    'revoke_invitation',
    'accept_invitation',
    'get_invitation_by_token',
    'get_workspace_readiness',
    'can_access_planning',
    'get_user_onboarding_status'
  );

  IF v_function_count < 10 THEN
    RAISE EXCEPTION 'Migration verification failed: Expected 10 functions, found %', v_function_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Onboarding RPC Functions Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  Organization: create_organization_with_admin, advance_org_status, update_workspace_config';
  RAISE NOTICE '  Invitations: invite_user, revoke_invitation, accept_invitation, get_invitation_by_token';
  RAISE NOTICE '  Readiness: get_workspace_readiness, can_access_planning, get_user_onboarding_status';
  RAISE NOTICE '=================================================================';
END $$;

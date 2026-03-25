-- ============================================================================
-- WORKSPACE LIFECYCLE: Owner Role + Archive Workspace
-- ============================================================================
-- Adds 'owner' role with full permissions, updates create_workspace to assign
-- owner role, and adds archive_workspace RPC for soft-delete lifecycle.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. ADD 'owner' ROLE WITH ALL PERMISSIONS
-- ============================================================

INSERT INTO public.roles (id, code, name, description, is_system_role)
VALUES (
  gen_random_uuid(),
  'owner',
  'Owner',
  'Workspace owner with full access and lifecycle control',
  true
)
ON CONFLICT (code) DO NOTHING;

-- Grant all permissions to owner role (same as admin)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'owner'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. UPDATE create_workspace TO ASSIGN 'owner' ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_owner_role_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;
  IF trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Workspace slug is required';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = trim(p_slug)) THEN
    RAISE EXCEPTION 'A workspace with this slug already exists';
  END IF;

  -- Get owner role id (fall back to admin if owner role doesn't exist)
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner';
  IF v_owner_role_id IS NULL THEN
    SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'admin';
  END IF;
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Owner/Admin role not found in roles table';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (id, name, slug, is_active, created_by)
  VALUES (gen_random_uuid(), trim(p_name), trim(p_slug), true, v_user_id)
  RETURNING id INTO v_workspace_id;

  -- Auto-assign creator as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role, role_id)
  VALUES (v_workspace_id, v_user_id, 'owner', v_owner_role_id);

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, metadata)
  VALUES (v_workspace_id, v_user_id, 'workspace_created',
    jsonb_build_object('name', trim(p_name), 'slug', trim(p_slug), 'role', 'owner'));

  RETURN v_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 3. ARCHIVE WORKSPACE RPC (soft delete)
-- ============================================================

CREATE OR REPLACE FUNCTION public.archive_workspace(
  p_workspace_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ws_name TEXT;
  v_member_role TEXT;
BEGIN
  -- Verify caller is a member of the workspace
  SELECT r.code INTO v_member_role
  FROM public.workspace_members wm
  LEFT JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_user_id;

  IF v_member_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this workspace';
  END IF;

  -- Only owner or admin can archive
  IF v_member_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only workspace owner or admin can archive a workspace';
  END IF;

  -- Get workspace name for audit
  SELECT name INTO v_ws_name FROM public.workspaces WHERE id = p_workspace_id;

  IF v_ws_name IS NULL THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  -- Soft delete: set is_active = false
  UPDATE public.workspaces
  SET is_active = false, updated_at = now()
  WHERE id = p_workspace_id;

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, metadata)
  VALUES (p_workspace_id, v_user_id, 'settings_updated',
    jsonb_build_object('action', 'archive', 'workspace_name', v_ws_name));
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_workspace(UUID) TO authenticated;

-- ============================================================
-- 4. UPDATE get_workspace_role TO HANDLE 'owner'
-- ============================================================
-- The existing get_workspace_role already returns r.code which will
-- return 'owner' for owner role. No change needed if it uses role_id join.
-- Let's verify/ensure it does:

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.code
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_role(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- DONE: Workspace lifecycle enhancements
-- - 'owner' role created with full permissions
-- - create_workspace() now assigns 'owner' role to creator
-- - archive_workspace() for soft-delete lifecycle
-- - get_workspace_role() confirmed to return role code from roles table
-- ============================================================================

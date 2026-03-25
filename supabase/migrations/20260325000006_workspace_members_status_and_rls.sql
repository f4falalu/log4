-- ============================================================================
-- WORKSPACE MEMBERS: Status Column + Hardened RLS
-- ============================================================================
-- Adds status (active|inactive) to workspace_members, updates
-- is_workspace_member_v2 to enforce active-only access, and updates
-- create_workspace to accept org_type. Also adds toggle_member_status RPC.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. ADD STATUS COLUMN TO workspace_members
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_members'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspace_members_status
  ON public.workspace_members(status);

-- ============================================================
-- 2. HARDEN is_workspace_member_v2 (require active status)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member_v2(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND workspace_id = p_workspace_id
      AND status = 'active'
  );
$$;

-- ============================================================
-- 3. UPDATE workspace_members RLS POLICIES
-- ============================================================
-- SELECT: all active members of the same workspace can view members
-- (not just owner/admin). This is needed for the members list page.

DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can view workspace members" ON public.workspace_members;

CREATE POLICY "Active members can view workspace members"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (
    -- Own membership (always visible)
    user_id = auth.uid()
    OR
    -- Active members of the same workspace can see other members
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- INSERT: admin/owner of workspace can add members
DROP POLICY IF EXISTS "Owners can add workspace members" ON public.workspace_members;
CREATE POLICY "Admins can add workspace members"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON r.id = wm.role_id
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
    -- Also allow SECURITY DEFINER RPCs (create_workspace auto-inserts)
    OR NOT EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspace_members.workspace_id
    )
  );

-- UPDATE: admin/owner can update (except owner self-downgrade is handled in RPC)
DROP POLICY IF EXISTS "Owners can update member roles" ON public.workspace_members;
CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON r.id = wm.role_id
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
  );

-- DELETE: admin/owner can remove (except owner can't be removed)
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;
CREATE POLICY "Admins can remove workspace members"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.roles r ON r.id = wm.role_id
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
        AND r.code IN ('owner', 'admin')
    )
    -- Cannot remove the owner
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm2
      JOIN public.roles r2 ON r2.id = wm2.role_id
      WHERE wm2.id = workspace_members.id
        AND r2.code = 'owner'
    )
  );

-- ============================================================
-- 4. TOGGLE MEMBER STATUS RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.toggle_member_status(
  p_workspace_id UUID,
  p_member_user_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_role TEXT;
  v_old_status TEXT;
BEGIN
  -- Validate status value
  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status: must be active or inactive';
  END IF;

  -- Get caller role
  SELECT r.code INTO v_caller_role
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_caller_id
    AND wm.status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: only owner or admin can change member status';
  END IF;

  -- Get target role
  SELECT r.code, wm.status INTO v_target_role, v_old_status
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_member_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  -- Cannot deactivate the owner
  IF v_target_role = 'owner' AND p_status = 'inactive' THEN
    RAISE EXCEPTION 'Cannot deactivate the workspace owner';
  END IF;

  -- Cannot change own status
  IF p_member_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot change your own status';
  END IF;

  -- Update status
  UPDATE public.workspace_members
  SET status = p_status
  WHERE workspace_id = p_workspace_id
    AND user_id = p_member_user_id;

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
  VALUES (p_workspace_id, v_caller_id,
    CASE WHEN p_status = 'inactive' THEN 'member_removed' ELSE 'member_added' END,
    p_member_user_id,
    jsonb_build_object('action', 'status_change', 'old_status', v_old_status, 'new_status', p_status));
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_member_status(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 5. UPDATE create_workspace TO ACCEPT org_type
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT,
  p_org_type TEXT DEFAULT NULL
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
  INSERT INTO public.workspaces (id, name, slug, org_type, is_active, created_by)
  VALUES (gen_random_uuid(), trim(p_name), trim(p_slug), p_org_type, true, v_user_id)
  RETURNING id INTO v_workspace_id;

  -- Auto-assign creator as owner (active)
  INSERT INTO public.workspace_members (workspace_id, user_id, role, role_id, status)
  VALUES (v_workspace_id, v_user_id, 'owner', v_owner_role_id, 'active');

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, metadata)
  VALUES (v_workspace_id, v_user_id, 'workspace_created',
    jsonb_build_object('name', trim(p_name), 'slug', trim(p_slug),
      'org_type', p_org_type, 'role', 'owner'));

  RETURN v_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 6. UPDATE get_my_workspaces TO ONLY RETURN ACTIVE MEMBERSHIPS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS TABLE (
  workspace_id UUID,
  name TEXT,
  slug TEXT,
  role_code TEXT,
  role_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    w.id AS workspace_id,
    w.name,
    w.slug,
    r.code AS role_code,
    r.name AS role_name
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND w.is_active = true
  ORDER BY w.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_workspaces() TO authenticated;

-- ============================================================
-- 7. UPDATE get_workspace_role TO CHECK ACTIVE STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.code
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
    AND wm.status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_role(UUID) TO authenticated;

-- ============================================================
-- 8. UPDATE update_workspace_general_settings TO ALLOW OWNER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_workspace_general_settings(
  p_workspace_id UUID,
  p_name TEXT,
  p_org_type TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member with admin or owner role
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.roles r ON r.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
      AND r.code IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Permission denied: only workspace admins can update settings';
  END IF;

  UPDATE public.workspaces
  SET
    name = COALESCE(p_name, name),
    org_type = p_org_type,
    settings = p_settings,
    updated_at = NOW()
  WHERE id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace not found: %', p_workspace_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_workspace_general_settings(UUID, TEXT, TEXT, JSONB) TO authenticated;

COMMIT;

-- ============================================================================
-- DONE: Workspace members status + hardened RLS
-- - status column (active|inactive) on workspace_members
-- - is_workspace_member_v2 now checks status = 'active'
-- - RLS policies updated for admin/owner role-based checks
-- - toggle_member_status RPC with owner protection
-- - create_workspace now accepts org_type
-- - get_my_workspaces filters by active membership + active workspace
-- - get_workspace_role checks active status
-- - update_workspace_general_settings allows owner role
-- ============================================================================

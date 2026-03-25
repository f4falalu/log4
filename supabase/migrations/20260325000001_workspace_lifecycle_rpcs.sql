-- ============================================================================
-- WORKSPACE LIFECYCLE: RPCs, Audit Table, Permission Management
-- ============================================================================
-- Fixes get_effective_permissions to use RBAC v2 tables, adds create_workspace
-- RPC, audit logging, and permission override management functions.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. RBAC AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rbac_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'permission_granted', 'permission_revoked', 'permissions_reset',
    'role_changed', 'member_added', 'member_removed',
    'workspace_created', 'settings_updated'
  )),
  target_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_workspace_time
  ON public.rbac_audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_user
  ON public.rbac_audit_logs(user_id);

ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_audit"
  ON public.rbac_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = rbac_audit_logs.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_can_insert_audit"
  ON public.rbac_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 2. FIX get_effective_permissions (use RBAC v2 tables)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_effective_permissions(
  p_user_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE (
  permission_id UUID,
  permission_code TEXT,
  category TEXT,
  description TEXT,
  granted BOOLEAN,
  source TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id AS permission_id,
    p.code AS permission_code,
    p.category,
    p.description,
    CASE
      WHEN rp.permission_id IS NOT NULL THEN true
      WHEN mp.permission_id IS NOT NULL AND mp.granted = true THEN true
      ELSE false
    END AS granted,
    CASE
      WHEN mp.permission_id IS NOT NULL AND mp.granted = true THEN 'override'
      WHEN rp.permission_id IS NOT NULL THEN 'role'
      ELSE 'none'
    END AS source
  FROM public.permissions p
  CROSS JOIN (
    SELECT wm.id AS wm_id, wm.role_id
    FROM public.workspace_members wm
    WHERE wm.user_id = p_user_id
      AND wm.workspace_id = p_workspace_id
    LIMIT 1
  ) member
  LEFT JOIN public.role_permissions rp
    ON rp.permission_id = p.id AND rp.role_id = member.role_id
  LEFT JOIN public.member_permissions mp
    ON mp.permission_id = p.id AND mp.workspace_member_id = member.wm_id
  ORDER BY p.category, p.code;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_permissions(UUID, UUID) TO authenticated;

-- ============================================================
-- 3. CREATE WORKSPACE RPC
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
  v_admin_role_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get admin role id
  SELECT id INTO v_admin_role_id FROM public.roles WHERE code = 'admin';
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found in roles table';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (id, name, slug, is_active, created_by)
  VALUES (gen_random_uuid(), p_name, p_slug, true, v_user_id)
  RETURNING id INTO v_workspace_id;

  -- Auto-assign creator as admin
  INSERT INTO public.workspace_members (workspace_id, user_id, role, role_id)
  VALUES (v_workspace_id, v_user_id, 'admin', v_admin_role_id);

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, metadata)
  VALUES (v_workspace_id, v_user_id, 'workspace_created',
    jsonb_build_object('name', p_name, 'slug', p_slug));

  RETURN v_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 4. SAVE MEMBER OVERRIDES RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_member_overrides(
  p_workspace_id UUID,
  p_member_user_id UUID,
  p_grant_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wm_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  -- Find the workspace member record
  SELECT id INTO v_wm_id
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_member_user_id;

  IF v_wm_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  -- Delete existing overrides
  DELETE FROM public.member_permissions
  WHERE workspace_member_id = v_wm_id;

  -- Insert new grants
  IF array_length(p_grant_ids, 1) > 0 THEN
    INSERT INTO public.member_permissions (workspace_member_id, permission_id, granted)
    SELECT v_wm_id, unnest(p_grant_ids), true
    ON CONFLICT (workspace_member_id, permission_id) DO NOTHING;
  END IF;

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
  VALUES (p_workspace_id, v_caller_id, 'permission_granted', p_member_user_id,
    jsonb_build_object('grant_count', coalesce(array_length(p_grant_ids, 1), 0)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_member_overrides(UUID, UUID, UUID[]) TO authenticated;

-- ============================================================
-- 5. RESET MEMBER OVERRIDES RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_member_overrides(
  p_workspace_id UUID,
  p_member_user_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wm_id UUID;
  v_caller_id UUID := auth.uid();
  v_deleted_count INT;
BEGIN
  SELECT id INTO v_wm_id
  FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_member_user_id;

  IF v_wm_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  DELETE FROM public.member_permissions
  WHERE workspace_member_id = v_wm_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
  VALUES (p_workspace_id, v_caller_id, 'permissions_reset', p_member_user_id,
    jsonb_build_object('deleted_count', v_deleted_count));
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_member_overrides(UUID, UUID) TO authenticated;

-- ============================================================
-- 6. UPDATE MEMBER ROLE v2 RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_member_role_v2(
  p_workspace_id UUID,
  p_member_user_id UUID,
  p_role_code TEXT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_old_role TEXT;
  v_caller_id UUID := auth.uid();
  v_legacy_role TEXT;
BEGIN
  -- Lookup new role
  SELECT id INTO v_role_id FROM public.roles WHERE code = p_role_code;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role code % not found', p_role_code;
  END IF;

  -- Map to legacy role column for backward compat
  v_legacy_role := CASE p_role_code
    WHEN 'admin' THEN 'admin'
    WHEN 'viewer' THEN 'viewer'
    ELSE 'member'
  END;

  -- Get old role for audit
  SELECT r.code INTO v_old_role
  FROM public.workspace_members wm
  LEFT JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_member_user_id;

  -- Update both role columns
  UPDATE public.workspace_members
  SET role_id = v_role_id, role = v_legacy_role
  WHERE workspace_id = p_workspace_id AND user_id = p_member_user_id;

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
  VALUES (p_workspace_id, v_caller_id, 'role_changed', p_member_user_id,
    jsonb_build_object('old_role', v_old_role, 'new_role', p_role_code));
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_v2(UUID, UUID, TEXT) TO authenticated;

COMMIT;

-- ============================================================================
-- DONE: Workspace lifecycle RPCs created.
-- - rbac_audit_logs table for tracking RBAC changes
-- - get_effective_permissions() fixed for RBAC v2
-- - create_workspace() for workspace creation flow
-- - save_member_overrides() for permission editor
-- - reset_member_overrides() for clearing overrides
-- - update_member_role_v2() for role changes with audit
-- ============================================================================

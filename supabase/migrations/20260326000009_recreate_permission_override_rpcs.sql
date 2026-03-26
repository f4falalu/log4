-- ============================================================================
-- RE-CREATE PERMISSION OVERRIDE RPCs
-- ============================================================================
-- Migration 20260325000001 was wrapped in BEGIN/COMMIT and likely rolled back
-- because CREATE POLICY (no IF NOT EXISTS) failed on existing policies.
-- This left save_member_overrides, reset_member_overrides, get_effective_permissions,
-- and update_member_role_v2 un-created. This migration re-creates them.
-- ============================================================================

-- Drop old get_effective_permissions (different return type from legacy migration 20250324000004)
DROP FUNCTION IF EXISTS public.get_effective_permissions(UUID, UUID);

-- 1. get_effective_permissions
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

-- 2. save_member_overrides
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

  -- Audit log (safe — skip if table missing)
  BEGIN
    INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
    VALUES (p_workspace_id, v_caller_id, 'permission_granted', p_member_user_id,
      jsonb_build_object('grant_count', coalesce(array_length(p_grant_ids, 1), 0)));
  EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_member_overrides(UUID, UUID, UUID[]) TO authenticated;

-- 3. reset_member_overrides
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

  -- Audit log (safe — skip if table missing)
  BEGIN
    INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
    VALUES (p_workspace_id, v_caller_id, 'permissions_reset', p_member_user_id,
      jsonb_build_object('deleted_count', v_deleted_count));
  EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_member_overrides(UUID, UUID) TO authenticated;

-- 4. update_member_role_v2
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
  SELECT id INTO v_role_id FROM public.roles WHERE code = p_role_code;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role code % not found', p_role_code;
  END IF;

  v_legacy_role := CASE p_role_code
    WHEN 'admin' THEN 'admin'
    WHEN 'viewer' THEN 'viewer'
    ELSE 'member'
  END;

  SELECT r.code INTO v_old_role
  FROM public.workspace_members wm
  LEFT JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_member_user_id;

  UPDATE public.workspace_members
  SET role_id = v_role_id, role = v_legacy_role
  WHERE workspace_id = p_workspace_id AND user_id = p_member_user_id;

  -- Audit log (safe — skip if table missing)
  BEGIN
    INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, target_user_id, metadata)
    VALUES (p_workspace_id, v_caller_id, 'role_changed', p_member_user_id,
      jsonb_build_object('old_role', v_old_role, 'new_role', p_role_code));
  EXCEPTION WHEN undefined_table OR check_violation THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role_v2(UUID, UUID, TEXT) TO authenticated;

-- Also ensure RLS policies on rbac_audit_logs exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rbac_audit_logs' AND policyname = 'workspace_members_can_view_audit'
  ) THEN
    CREATE POLICY "workspace_members_can_view_audit"
      ON public.rbac_audit_logs FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = rbac_audit_logs.workspace_id
            AND wm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rbac_audit_logs' AND policyname = 'authenticated_can_insert_audit'
  ) THEN
    CREATE POLICY "authenticated_can_insert_audit"
      ON public.rbac_audit_logs FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

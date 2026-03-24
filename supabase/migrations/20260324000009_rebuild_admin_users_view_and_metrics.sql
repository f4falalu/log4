-- ============================================================================
-- PHASE 1.3: REBUILD admin_users_view + get_admin_dashboard_metrics
-- ============================================================================
-- The RBAC v2 cleanup (000001) dropped user_roles.role and is_system_admin(),
-- which broke:
--   1. admin_users_view (referenced ur.role)
--   2. get_admin_dashboard_metrics() (called is_system_admin(), queried ur.role)
--
-- This migration recreates both using the v2 schema:
--   workspace_members.role_id → roles.code
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. REBUILD admin_users_view
-- ============================================================
-- Shows users visible to the caller (same workspace membership).
-- Roles are aggregated from workspace_members → roles.

DROP VIEW IF EXISTS public.admin_users_view CASCADE;

CREATE VIEW public.admin_users_view
WITH (security_invoker = false)
AS
SELECT
  u.id,
  u.email,
  u.phone,
  u.created_at,
  u.last_sign_in_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.raw_user_meta_data  AS user_metadata,
  u.raw_app_meta_data   AS app_metadata,
  p.full_name,
  p.avatar_url,
  p.updated_at          AS profile_updated_at,
  -- Organization from workspace name (first workspace, alphabetical)
  (
    SELECT w.name
    FROM public.workspace_members wm2
    JOIN public.workspaces w ON w.id = wm2.workspace_id
    WHERE wm2.user_id = u.id
    ORDER BY w.name
    LIMIT 1
  ) AS organization,
  -- Distinct role codes across all workspaces
  COALESCE(
    (
      SELECT array_agg(DISTINCT r.code ORDER BY r.code)
      FROM public.workspace_members wm2
      JOIN public.roles r ON r.id = wm2.role_id
      WHERE wm2.user_id = u.id
    ),
    ARRAY[]::text[]
  ) AS roles,
  -- Count distinct roles
  (
    SELECT COUNT(DISTINCT r.code)
    FROM public.workspace_members wm2
    JOIN public.roles r ON r.id = wm2.role_id
    WHERE wm2.user_id = u.id
  ) AS role_count,
  -- Count workspaces
  (
    SELECT COUNT(*)
    FROM public.workspace_members wm2
    WHERE wm2.user_id = u.id
  ) AS workspace_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
-- Limit to users who share at least one workspace with the caller
WHERE u.id IN (
  SELECT wm1.user_id
  FROM public.workspace_members wm1
  WHERE wm1.workspace_id IN (
    SELECT wm0.workspace_id
    FROM public.workspace_members wm0
    WHERE wm0.user_id = auth.uid()
  )
);

REVOKE ALL ON public.admin_users_view FROM anon;
REVOKE ALL ON public.admin_users_view FROM authenticated;
GRANT SELECT ON public.admin_users_view TO authenticated;

-- ============================================================
-- 2. REBUILD get_admin_dashboard_metrics()
-- ============================================================
-- Uses workspace_members + roles instead of dropped is_system_admin()
-- and user_roles.role.

CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_workspace_ids UUID[];
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user has admin role in any workspace
  SELECT EXISTS(
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.roles r ON r.id = wm.role_id
    WHERE wm.user_id = auth.uid()
      AND r.code = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  -- If user has no workspaces, return zeros
  IF array_length(v_workspace_ids, 1) IS NULL THEN
    SELECT json_build_object(
      'total_users', 0,
      'active_sessions', 0,
      'events_today', 0,
      'total_workspaces', 0,
      'system_admins', 0
    ) INTO result;
    RETURN result;
  END IF;

  SELECT json_build_object(
    'total_users', (
      SELECT COUNT(DISTINCT wm.user_id)
      FROM workspace_members wm
      WHERE wm.workspace_id = ANY(v_workspace_ids)
    ),
    'active_sessions', (
      SELECT COUNT(*)
      FROM driver_sessions ds
      WHERE UPPER(ds.status) = 'ACTIVE'
        AND ds.driver_id IN (
          SELECT wm.user_id FROM workspace_members wm
          WHERE wm.workspace_id = ANY(v_workspace_ids)
        )
    ),
    'events_today', (
      SELECT COUNT(*)
      FROM mod4_events me
      WHERE me.created_at::date = CURRENT_DATE
        AND me.session_id IN (
          SELECT ds.id FROM driver_sessions ds
          WHERE ds.driver_id IN (
            SELECT wm.user_id FROM workspace_members wm
            WHERE wm.workspace_id = ANY(v_workspace_ids)
          )
        )
    ),
    'total_workspaces', (
      SELECT COUNT(*)
      FROM workspaces w
      WHERE w.id = ANY(v_workspace_ids)
        AND w.is_active = true
    ),
    'system_admins', (
      SELECT COUNT(DISTINCT wm.user_id)
      FROM workspace_members wm
      JOIN roles r ON r.id = wm.role_id
      WHERE r.code = 'admin'
        AND wm.workspace_id = ANY(v_workspace_ids)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_metrics() TO authenticated;

COMMIT;

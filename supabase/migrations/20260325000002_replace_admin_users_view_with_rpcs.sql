-- ============================================================================
-- Replace admin_users_view with RPC functions
-- ============================================================================
-- The Supabase linter flags admin_users_view as a critical security issue
-- because it exposes auth.users to authenticated roles via a view.
-- Fix: drop the view and create SECURITY DEFINER RPCs with explicit role checks.
-- Also: enable RLS on spatial_ref_sys (PostGIS system table).
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. DROP admin_users_view
-- ============================================================
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

-- ============================================================
-- 2. RPC: get_admin_users (replaces the view for list queries)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_caller_workspaces UUID[];
BEGIN
  -- Require admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.roles r ON r.id = wm.role_id
    WHERE wm.user_id = auth.uid() AND r.code = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get caller's workspaces
  SELECT ARRAY(
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) INTO v_caller_workspaces;

  SELECT json_build_object(
    'users', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
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
          (
            SELECT w.name
            FROM public.workspace_members wm2
            JOIN public.workspaces w ON w.id = wm2.workspace_id
            WHERE wm2.user_id = u.id
            ORDER BY w.name LIMIT 1
          ) AS organization,
          COALESCE(
            (SELECT array_agg(DISTINCT r.code ORDER BY r.code)
             FROM public.workspace_members wm2
             JOIN public.roles r ON r.id = wm2.role_id
             WHERE wm2.user_id = u.id),
            ARRAY[]::text[]
          ) AS roles,
          (SELECT COUNT(DISTINCT r.code)
           FROM public.workspace_members wm2
           JOIN public.roles r ON r.id = wm2.role_id
           WHERE wm2.user_id = u.id) AS role_count,
          (SELECT COUNT(*)
           FROM public.workspace_members wm2
           WHERE wm2.user_id = u.id) AS workspace_count
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id IN (
          SELECT wm1.user_id FROM public.workspace_members wm1
          WHERE wm1.workspace_id = ANY(v_caller_workspaces)
        )
        AND (
          p_search IS NULL
          OR u.email ILIKE '%' || p_search || '%'
          OR p.full_name ILIKE '%' || p_search || '%'
        )
        AND (
          p_role_filter IS NULL
          OR u.id IN (
            SELECT wm3.user_id
            FROM public.workspace_members wm3
            JOIN public.roles r ON r.id = wm3.role_id
            WHERE r.code = ANY(p_role_filter)
          )
        )
        ORDER BY u.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) t
    ), '[]'::json),
    'total', (
      SELECT COUNT(DISTINCT u.id)
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id IN (
        SELECT wm1.user_id FROM public.workspace_members wm1
        WHERE wm1.workspace_id = ANY(v_caller_workspaces)
      )
      AND (
        p_search IS NULL
        OR u.email ILIKE '%' || p_search || '%'
        OR p.full_name ILIKE '%' || p_search || '%'
      )
      AND (
        p_role_filter IS NULL
        OR u.id IN (
          SELECT wm3.user_id
          FROM public.workspace_members wm3
          JOIN public.roles r ON r.id = wm3.role_id
          WHERE r.code = ANY(p_role_filter)
        )
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users(TEXT, TEXT[], INT, INT) TO authenticated;

-- ============================================================
-- 3. RPC: get_admin_user_by_id (single user detail)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_user_by_id(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Require admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.roles r ON r.id = wm.role_id
    WHERE wm.user_id = auth.uid() AND r.code = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Require shared workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    WHERE wm1.user_id = p_user_id
      AND wm1.workspace_id IN (
        SELECT wm0.workspace_id FROM public.workspace_members wm0
        WHERE wm0.user_id = auth.uid()
      )
  ) THEN
    RAISE EXCEPTION 'User not found or not in shared workspace';
  END IF;

  SELECT row_to_json(t) INTO result
  FROM (
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
      (
        SELECT w.name
        FROM public.workspace_members wm2
        JOIN public.workspaces w ON w.id = wm2.workspace_id
        WHERE wm2.user_id = u.id
        ORDER BY w.name LIMIT 1
      ) AS organization,
      COALESCE(
        (SELECT array_agg(DISTINCT r.code ORDER BY r.code)
         FROM public.workspace_members wm2
         JOIN public.roles r ON r.id = wm2.role_id
         WHERE wm2.user_id = u.id),
        ARRAY[]::text[]
      ) AS roles,
      (SELECT COUNT(DISTINCT r.code)
       FROM public.workspace_members wm2
       JOIN public.roles r ON r.id = wm2.role_id
       WHERE wm2.user_id = u.id) AS role_count,
      (SELECT COUNT(*)
       FROM public.workspace_members wm2
       WHERE wm2.user_id = u.id) AS workspace_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = p_user_id
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_by_id(UUID) TO authenticated;

-- ============================================================
-- 4. RPC: get_user_emails (for workspace member email lookup)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_emails(p_user_ids UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Require authenticated user who shares a workspace with target users
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT u.id, u.email
    FROM auth.users u
    WHERE u.id = ANY(p_user_ids)
      AND u.id IN (
        SELECT wm1.user_id FROM public.workspace_members wm1
        WHERE wm1.workspace_id IN (
          SELECT wm0.workspace_id FROM public.workspace_members wm0
          WHERE wm0.user_id = auth.uid()
        )
      )
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO authenticated;

-- NOTE: spatial_ref_sys is owned by PostGIS (superuser) — RLS cannot be
-- enabled from the migration role. This must be done via the Supabase
-- Dashboard SQL Editor with superuser privileges, or accepted as a known
-- lint warning (it contains only public EPSG projection definitions).

COMMIT;

-- Fix Admin Workspace Scoping
-- Purpose: Ensure admin functions only return data for workspaces the user belongs to
-- This prevents cross-tenant data exposure in multi-tenancy scenarios

-- ============================================================================
-- 1. HELPER FUNCTION: Get user's workspace IDs as ARRAY
-- Note: get_user_workspace_ids(UUID) already exists and returns SETOF UUID
-- This wrapper returns an array for easier use in ANY() clauses
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_workspace_ids_array();

CREATE OR REPLACE FUNCTION get_user_workspace_ids_array()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(SELECT * FROM public.get_user_workspace_ids(auth.uid())),
    ARRAY[]::UUID[]
  );
$$;

COMMENT ON FUNCTION get_user_workspace_ids_array IS 'Returns array of workspace IDs the current user belongs to';

-- ============================================================================
-- 2. HELPER FUNCTION: Check if user is system_admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  );
$$;

COMMENT ON FUNCTION is_system_admin IS 'Returns true if current user has system_admin role';

-- ============================================================================
-- 3. FIX: get_admin_dashboard_metrics - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_workspace_ids UUID[];
  v_is_system_admin BOOLEAN;
BEGIN
  -- Check if user is system_admin
  v_is_system_admin := is_system_admin();

  IF NOT v_is_system_admin THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
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
    -- Count users in same workspaces (workspace-scoped)
    'total_users', (
      SELECT COUNT(DISTINCT wm.user_id)
      FROM workspace_members wm
      WHERE wm.workspace_id = ANY(v_workspace_ids)
    ),
    -- Count active sessions for users in same workspaces
    -- driver_sessions.driver_id references auth.users(id), so we join through workspace_members
    -- Note: status check is case-insensitive due to mixed conventions in migrations
    'active_sessions', (
      SELECT COUNT(*)
      FROM driver_sessions ds
      WHERE UPPER(ds.status) = 'ACTIVE'
        AND ds.driver_id IN (
          SELECT wm.user_id FROM workspace_members wm
          WHERE wm.workspace_id = ANY(v_workspace_ids)
        )
    ),
    -- Count events for sessions by users in same workspaces
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
    -- Count only workspaces user belongs to
    'total_workspaces', (
      SELECT COUNT(*)
      FROM workspaces w
      WHERE w.id = ANY(v_workspace_ids)
        AND w.is_active = true
    ),
    -- Count system admins in same workspaces
    'system_admins', (
      SELECT COUNT(DISTINCT ur.user_id)
      FROM user_roles ur
      WHERE ur.role = 'system_admin'
        AND ur.user_id IN (
          SELECT wm.user_id FROM workspace_members wm
          WHERE wm.workspace_id = ANY(v_workspace_ids)
        )
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_admin_dashboard_metrics IS 'Returns workspace-scoped metrics for admin dashboard. Requires system_admin role.';

-- ============================================================================
-- 4. FIX: get_users_with_roles - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_users_with_roles(
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  roles TEXT[],
  workspace_count INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  -- Verify caller is system_admin
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
  END IF;

  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    au.email,
    p.phone,
    p.avatar_url,
    ARRAY_AGG(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL) AS roles,
    COUNT(DISTINCT wm.workspace_id)::INT AS workspace_count,
    p.created_at
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  -- Only include users who are in at least one of admin's workspaces
  JOIN workspace_members wm_filter ON wm_filter.user_id = p.id
    AND wm_filter.workspace_id = ANY(v_workspace_ids)
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN workspace_members wm ON wm.user_id = p.id
  WHERE (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR au.email ILIKE '%' || p_search || '%')
    AND (p_role_filter IS NULL OR ur.role::text = ANY(p_role_filter))
  GROUP BY p.id, au.email
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_users_with_roles IS 'Returns workspace-scoped user list with roles. Requires system_admin role.';

-- ============================================================================
-- 5. FIX: get_user_growth - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_growth(p_days INT DEFAULT 30)
RETURNS TABLE (date DATE, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  RETURN QUERY
  SELECT
    wm.created_at::date AS date,
    COUNT(DISTINCT wm.user_id) AS count
  FROM workspace_members wm
  WHERE wm.workspace_id = ANY(v_workspace_ids)
    AND wm.created_at >= CURRENT_DATE - p_days
  GROUP BY wm.created_at::date
  ORDER BY date ASC;
END;
$$;

COMMENT ON FUNCTION get_user_growth IS 'Returns workspace-scoped user registration counts by day.';

-- ============================================================================
-- 6. FIX: get_session_activity - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_activity(p_days INT DEFAULT 30)
RETURNS TABLE (date DATE, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  RETURN QUERY
  SELECT
    ds.started_at::date AS date,
    COUNT(*) AS count
  FROM driver_sessions ds
  -- driver_sessions.driver_id references auth.users(id)
  WHERE ds.driver_id IN (
    SELECT wm.user_id FROM workspace_members wm
    WHERE wm.workspace_id = ANY(v_workspace_ids)
  )
    AND ds.started_at >= CURRENT_DATE - p_days
  GROUP BY ds.started_at::date
  ORDER BY date ASC;
END;
$$;

COMMENT ON FUNCTION get_session_activity IS 'Returns workspace-scoped session counts by day.';

-- ============================================================================
-- 7. FIX: get_event_distribution - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_distribution()
RETURNS TABLE (event_type TEXT, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  RETURN QUERY
  SELECT
    me.event_type,
    COUNT(*) AS count
  FROM mod4_events me
  JOIN driver_sessions ds ON me.session_id = ds.id
  -- driver_sessions.driver_id references auth.users(id)
  WHERE ds.driver_id IN (
    SELECT wm.user_id FROM workspace_members wm
    WHERE wm.workspace_id = ANY(v_workspace_ids)
  )
    AND me.created_at >= CURRENT_DATE - 7
  GROUP BY me.event_type
  ORDER BY count DESC;
END;
$$;

COMMENT ON FUNCTION get_event_distribution IS 'Returns workspace-scoped event type distribution for the last 7 days.';

-- ============================================================================
-- 8. FIX: get_session_gps_quality - Workspace scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_gps_quality(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_workspace_ids UUID[];
BEGIN
  -- Verify caller is system_admin
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
  END IF;

  -- Get user's workspace IDs
  v_workspace_ids := get_user_workspace_ids_array();

  -- Verify session belongs to a user in admin's workspace
  IF NOT EXISTS (
    SELECT 1 FROM driver_sessions ds
    WHERE ds.id = p_session_id
      AND ds.driver_id IN (
        SELECT wm.user_id FROM workspace_members wm
        WHERE wm.workspace_id = ANY(v_workspace_ids)
      )
  ) THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  SELECT json_build_object(
    'avg_accuracy_m', AVG(accuracy_m),
    'total_points', COUNT(*),
    'points_under_50m', COUNT(*) FILTER (WHERE accuracy_m < 50),
    'coverage_percent', (COUNT(*) FILTER (WHERE accuracy_m < 50)::FLOAT / NULLIF(COUNT(*), 0) * 100)
  ) INTO result
  FROM driver_gps_events
  WHERE session_id = p_session_id;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_session_gps_quality IS 'Returns GPS quality metrics for a session. Requires system_admin role and workspace access.';

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_workspace_ids_array TO authenticated;
GRANT EXECUTE ON FUNCTION is_system_admin TO authenticated;

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Admin Workspace Scoping Fix Applied';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'The following functions are now workspace-scoped:';
  RAISE NOTICE '  - get_admin_dashboard_metrics()';
  RAISE NOTICE '  - get_users_with_roles()';
  RAISE NOTICE '  - get_user_growth()';
  RAISE NOTICE '  - get_session_activity()';
  RAISE NOTICE '  - get_event_distribution()';
  RAISE NOTICE '  - get_session_gps_quality()';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins will now only see data from workspaces they belong to.';
  RAISE NOTICE '=================================================================';
END $$;

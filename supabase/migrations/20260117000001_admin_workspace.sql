-- Admin Workspace Database Functions
-- This migration creates all necessary RPC functions for the Admin workspace

-- ============================================================================
-- ADMIN DASHBOARD METRICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify caller is system_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_sessions', (SELECT COUNT(*) FROM driver_sessions WHERE status = 'active'),
    'events_today', (SELECT COUNT(*) FROM mod4_events WHERE created_at::date = CURRENT_DATE),
    'total_workspaces', (SELECT COUNT(*) FROM workspaces WHERE is_active = true),
    'system_admins', (SELECT COUNT(*) FROM user_roles WHERE role = 'system_admin')
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_metrics TO authenticated;

COMMENT ON FUNCTION get_admin_dashboard_metrics IS 'Returns key metrics for admin dashboard. Requires system_admin role.';

-- ============================================================================
-- USER MANAGEMENT
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
BEGIN
  -- Verify caller is system_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
  END IF;

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

GRANT EXECUTE ON FUNCTION get_users_with_roles TO authenticated;

COMMENT ON FUNCTION get_users_with_roles IS 'Returns paginated user list with roles and workspace counts. Requires system_admin role.';

-- ============================================================================
-- ROLE ASSIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is system_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Only system_admin can assign roles';
  END IF;

  -- Verify the role being assigned is valid
  IF p_role NOT IN ('system_admin', 'warehouse_officer', 'driver', 'zonal_manager', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Insert the role (on conflict do nothing to prevent duplicates)
  INSERT INTO user_roles (user_id, role, assigned_by)
  VALUES (p_user_id, p_role::app_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_user_role TO authenticated;

COMMENT ON FUNCTION assign_user_role IS 'Assigns a role to a user. Requires system_admin role.';

-- ============================================================================
-- ROLE REMOVAL
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is system_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Only system_admin can remove roles';
  END IF;

  -- Delete the role
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role = p_role::app_role;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_user_role TO authenticated;

COMMENT ON FUNCTION remove_user_role IS 'Removes a role from a user. Requires system_admin role.';

-- ============================================================================
-- SESSION MONITORING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_gps_quality(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify caller is system_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'system_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: system_admin role required';
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

GRANT EXECUTE ON FUNCTION get_session_gps_quality TO authenticated;

COMMENT ON FUNCTION get_session_gps_quality IS 'Returns GPS quality metrics for a session. Requires system_admin role.';

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_growth(p_days INT DEFAULT 30)
RETURNS TABLE (date DATE, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    created_at::date AS date,
    COUNT(*) AS count
  FROM profiles
  WHERE created_at >= CURRENT_DATE - p_days
  GROUP BY created_at::date
  ORDER BY date ASC;
$$;

GRANT EXECUTE ON FUNCTION get_user_growth TO authenticated;

COMMENT ON FUNCTION get_user_growth IS 'Returns user registration counts by day for the specified number of days.';

CREATE OR REPLACE FUNCTION get_session_activity(p_days INT DEFAULT 30)
RETURNS TABLE (date DATE, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    started_at::date AS date,
    COUNT(*) AS count
  FROM driver_sessions
  WHERE started_at >= CURRENT_DATE - p_days
  GROUP BY started_at::date
  ORDER BY date ASC;
$$;

GRANT EXECUTE ON FUNCTION get_session_activity TO authenticated;

COMMENT ON FUNCTION get_session_activity IS 'Returns session counts by day for the specified number of days.';

CREATE OR REPLACE FUNCTION get_event_distribution()
RETURNS TABLE (event_type TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    event_type,
    COUNT(*) AS count
  FROM mod4_events
  WHERE created_at >= CURRENT_DATE - 7
  GROUP BY event_type
  ORDER BY count DESC;
$$;

GRANT EXECUTE ON FUNCTION get_event_distribution TO authenticated;

COMMENT ON FUNCTION get_event_distribution IS 'Returns event type distribution for the last 7 days.';

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for user list queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC);

-- Index for session monitoring
CREATE INDEX IF NOT EXISTS idx_driver_sessions_status
ON driver_sessions(status, last_heartbeat_at DESC);

-- Index for event auditing
CREATE INDEX IF NOT EXISTS idx_mod4_events_type_date
ON mod4_events(event_type, created_at DESC);

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
ON user_roles(user_id);

-- Index for workspace member lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
ON workspace_members(workspace_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- =====================================================
-- RBAC System - Part 6: Permission Checking Functions
-- =====================================================
-- Creates comprehensive permission checking functions:
--   - has_permission() - check if user has specific permission
--   - get_user_permissions() - get all effective permissions
--   - can_access_resource() - check permission + scope
--   - Updated has_role() - backward compatible
-- =====================================================

-- =====================================================
-- 1. CORE PERMISSION CHECKING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if permission exists from roles OR permission sets
  RETURN EXISTS (
    -- From roles
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.code = _permission_code

    UNION

    -- From permission sets (non-expired)
    SELECT 1
    FROM public.user_permission_sets ups
    JOIN public.permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
    JOIN public.permissions p ON psp.permission_id = p.id
    WHERE ups.user_id = _user_id
      AND p.code = _permission_code
      AND (ups.expires_at IS NULL OR ups.expires_at > now())
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.has_permission IS
  'Check if user has a specific permission (from roles or permission sets)';

-- =====================================================
-- 2. GET ALL USER PERMISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_code TEXT, source TEXT) AS $$
  -- From roles
  SELECT DISTINCT
    p.code AS permission_code,
    'role' AS source
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = _user_id

  UNION

  -- From permission sets (non-expired)
  SELECT DISTINCT
    p.code AS permission_code,
    'permission_set' AS source
  FROM public.user_permission_sets ups
  JOIN public.permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
  JOIN public.permissions p ON psp.permission_id = p.id
  WHERE ups.user_id = _user_id
    AND (ups.expires_at IS NULL OR ups.expires_at > now());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_permissions IS
  'Get all effective permissions for a user with their source (role or permission_set)';

-- =====================================================
-- 3. PERMISSION + SCOPE CHECKING
-- =====================================================

-- Check warehouse-scoped permission
CREATE OR REPLACE FUNCTION public.can_access_warehouse_resource(
  _user_id UUID,
  _permission_code TEXT,
  _warehouse_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- First check permission
  IF NOT public.has_permission(_user_id, _permission_code) THEN
    RETURN FALSE;
  END IF;

  -- Then check warehouse scope
  RETURN public.user_has_warehouse_access(_user_id, _warehouse_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check program-scoped permission
CREATE OR REPLACE FUNCTION public.can_access_program_resource(
  _user_id UUID,
  _permission_code TEXT,
  _program_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- First check permission
  IF NOT public.has_permission(_user_id, _permission_code) THEN
    RETURN FALSE;
  END IF;

  -- Then check program scope
  RETURN public.user_has_program_access(_user_id, _program_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Generic resource access check
CREATE OR REPLACE FUNCTION public.can_access_resource(
  _user_id UUID,
  _permission_code TEXT,
  _warehouse_id UUID DEFAULT NULL,
  _program_id UUID DEFAULT NULL,
  _zone_id UUID DEFAULT NULL,
  _facility_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- First check permission
  IF NOT public.has_permission(_user_id, _permission_code) THEN
    RETURN FALSE;
  END IF;

  -- Check warehouse scope if provided
  IF _warehouse_id IS NOT NULL THEN
    IF NOT public.user_has_warehouse_access(_user_id, _warehouse_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check program scope if provided
  IF _program_id IS NOT NULL THEN
    IF NOT public.user_has_program_access(_user_id, _program_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check zone scope if provided
  IF _zone_id IS NOT NULL THEN
    IF NOT public.user_has_zone_access(_user_id, _zone_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check facility scope if provided
  IF _facility_id IS NOT NULL THEN
    IF NOT public.user_has_facility_access(_user_id, _facility_id) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- All checks passed
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.can_access_resource IS
  'Comprehensive access check: permission + all applicable scopes';

-- =====================================================
-- 4. KEEP EXISTING has_role() AND ADD NEW VERSION
-- =====================================================
-- Keep old has_role(UUID, app_role) for RLS policies
-- Add new has_role(UUID, TEXT) for new code

-- The old function still works because user_roles.role still exists
-- It will continue to function until we remove the old role column

-- Add new overloaded version that accepts text and uses the new roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.code = _role_code
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS
  'NEW VERSION: Check if user has a specific role (by role code from roles table)';

-- =====================================================
-- 5. UTILITY FUNCTIONS
-- =====================================================

-- Check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(_user_id, 'system_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's role codes
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role_code TEXT, role_name TEXT) AS $$
  SELECT r.code, r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = _user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get user's permission set codes
CREATE OR REPLACE FUNCTION public.get_user_permission_sets(_user_id UUID)
RETURNS TABLE(
  permission_set_code TEXT,
  permission_set_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
  SELECT
    ps.code,
    ps.name,
    ups.expires_at
  FROM public.user_permission_sets ups
  JOIN public.permission_sets ps ON ups.permission_set_id = ps.id
  WHERE ups.user_id = _user_id
    AND (ups.expires_at IS NULL OR ups.expires_at > now());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if permission is dangerous
CREATE OR REPLACE FUNCTION public.is_dangerous_permission(_permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_dangerous FROM public.permissions WHERE code = _permission_code),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- 6. CREATE MATERIALIZED VIEW FOR PERFORMANCE
-- =====================================================
-- Pre-computed user permissions for fast lookups

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_permissions AS
SELECT DISTINCT
  ur.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'role' AS source,
  r.code AS role_code
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON ur.role_id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id

UNION

SELECT DISTINCT
  ups.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'permission_set' AS source,
  ps.code AS role_code
FROM public.user_permission_sets ups
JOIN public.permission_sets ps ON ups.permission_set_id = ps.id
JOIN public.permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
JOIN public.permissions p ON psp.permission_id = p.id
WHERE ups.expires_at IS NULL OR ups.expires_at > now();

-- Indexes for materialized view
-- Note: Not UNIQUE because a user can have the same permission from multiple sources
CREATE INDEX idx_mv_user_permissions_user_perm
  ON public.mv_user_permissions(user_id, permission_code);
CREATE INDEX idx_mv_user_permissions_user
  ON public.mv_user_permissions(user_id);
CREATE INDEX idx_mv_user_permissions_code
  ON public.mv_user_permissions(permission_code);

COMMENT ON MATERIALIZED VIEW public.mv_user_permissions IS
  'Pre-computed user permissions for fast lookups. Refresh after role/permission changes.';

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_user_permissions()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-refresh trigger when roles/permissions change
CREATE OR REPLACE FUNCTION public.auto_refresh_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule materialized view refresh (async, non-blocking)
  PERFORM public.refresh_user_permissions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to refresh on changes
CREATE OR REPLACE TRIGGER refresh_on_user_roles_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_refresh_user_permissions();

CREATE OR REPLACE TRIGGER refresh_on_role_permissions_change
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_refresh_user_permissions();

CREATE OR REPLACE TRIGGER refresh_on_user_permission_sets_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permission_sets
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_refresh_user_permissions();

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname LIKE 'has_permission%'
    OR proname LIKE 'can_access%'
    OR proname LIKE 'get_user_%'
    OR proname = 'is_system_admin';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Permission Functions Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Permission checking functions: %', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Core Functions:';
  RAISE NOTICE '  - has_permission(user_id, permission_code)';
  RAISE NOTICE '  - get_user_permissions(user_id)';
  RAISE NOTICE '  - can_access_resource(user_id, permission, scopes...)';
  RAISE NOTICE '  - can_access_warehouse_resource(user_id, permission, warehouse_id)';
  RAISE NOTICE '  - can_access_program_resource(user_id, permission, program_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Backward Compatible:';
  RAISE NOTICE '  - has_role(user_id, role_code) [UPDATED]';
  RAISE NOTICE '';
  RAISE NOTICE 'Utility Functions:';
  RAISE NOTICE '  - is_system_admin(user_id)';
  RAISE NOTICE '  - get_user_roles(user_id)';
  RAISE NOTICE '  - get_user_permission_sets(user_id)';
  RAISE NOTICE '  - is_dangerous_permission(permission_code)';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Optimization:';
  RAISE NOTICE '  - Materialized view: mv_user_permissions';
  RAISE NOTICE '  - Auto-refresh triggers attached';
  RAISE NOTICE '  - refresh_user_permissions() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage Example:';
  RAISE NOTICE '  SELECT has_permission(auth.uid(), ''batch.dispatch'');';
  RAISE NOTICE '  SELECT can_access_warehouse_resource(';
  RAISE NOTICE '    auth.uid(), ''inventory.adjust'', warehouse_id';
  RAISE NOTICE '  );';
  RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- Fix is_system_admin() (no-arg version) to use new role_id schema
-- ============================================================================
-- Problem: The no-arg is_system_admin() still checks the deprecated
-- user_roles.role enum column. Functions like get_admin_dashboard_metrics()
-- call this version, which will break once the old role column is dropped.
--
-- Fix: Update to JOIN through role_id → roles.code like has_role() does.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.code = 'system_admin'
  );
$$;

COMMENT ON FUNCTION public.is_system_admin() IS
  'Returns true if current user has system_admin role. Uses role_id FK to roles table.';

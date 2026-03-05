-- ============================================================================
-- Grant SELECT on roles table to authenticated users
-- ============================================================================
-- Problem: The roles table has RLS enabled with a proper SELECT policy
-- ("All authenticated users can view roles") but is MISSING a GRANT SELECT
-- for the authenticated role. PostgREST requires BOTH:
--   1. RLS policy (exists) — controls which rows are visible
--   2. GRANT permission (MISSING) — controls table-level access
--
-- Without the GRANT, PostgREST embedded selects like:
--   .from('user_roles').select('role_id, roles:role_id (code)')
-- return NULL for the joined roles data, causing useUserRole() to return
-- an empty array and triggering "Access denied: system_admin role required".
-- ============================================================================

GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.roles TO anon;

-- Also ensure role_permissions is accessible for RBAC permission checks
GRANT SELECT ON public.role_permissions TO authenticated;

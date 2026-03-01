-- ============================================================================
-- Create get_my_roles() RPC — SECURITY DEFINER to bypass RLS
-- ============================================================================
-- Problem: PostgREST SELECT on user_roles/roles tables fails silently due to
-- RLS policy evaluation issues. The frontend useUserRole() hook gets empty
-- results, causing "Access denied: system_admin role required" errors.
--
-- Fix: A SECURITY DEFINER function that returns the current user's role codes
-- directly, bypassing all RLS. This is the same approach used by has_role()
-- and is_system_admin() which work correctly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(r.code),
    ARRAY[]::TEXT[]
  )
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_roles() IS
  'Returns array of role codes for the current user. SECURITY DEFINER to bypass RLS.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

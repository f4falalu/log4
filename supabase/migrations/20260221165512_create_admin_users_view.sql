-- ============================================================================
-- Create admin_users_view for PostgREST access to user data
-- ============================================================================
-- Purpose: Provide PostgREST-accessible view combining auth.users + profiles
-- + user_roles for admin user management
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.admin_users_view;

-- Create view combining auth.users with profiles and aggregated roles
CREATE VIEW public.admin_users_view
WITH (security_invoker=on)
AS
SELECT
  u.id,
  u.email,
  u.phone,
  u.created_at,
  u.last_sign_in_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.raw_user_meta_data AS user_metadata,
  u.raw_app_meta_data AS app_metadata,
  p.full_name,
  p.avatar_url,
  p.updated_at AS profile_updated_at,
  -- Aggregate roles into array
  COALESCE(
    (
      SELECT array_agg(ur.role::text ORDER BY ur.role)
      FROM public.user_roles ur
      WHERE ur.user_id = u.id
    ),
    ARRAY[]::text[]
  ) AS roles,
  -- Count of roles
  (
    SELECT COUNT(*)
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
  ) AS role_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- Grant select access to authenticated users
-- RLS will be handled by the underlying tables (profiles, user_roles)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Add comment
COMMENT ON VIEW public.admin_users_view IS
  'Admin-accessible view combining auth.users, profiles, and user_roles for user management';

-- ============================================================================
-- Create RLS policy for admin access
-- ============================================================================

-- Note: Views with security_invoker=on use the invoker's permissions
-- The underlying tables (profiles, user_roles) already have RLS policies
-- System admins can see all profiles via the "Admins can view all profiles" policy
-- Regular users can only see their own data via "Users can view their own profile" policy

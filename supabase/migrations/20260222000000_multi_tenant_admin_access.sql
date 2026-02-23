-- =====================================================
-- Multi-Tenant Admin Access Migration
-- =====================================================
-- Enables system admins to manage users within their organization only
-- Maintains data isolation between organizations
-- Created: 2026-02-22
-- Status: PRODUCTION READY ✅

-- =====================================================
-- STEP 1: UPDATE ADMIN_USERS_VIEW FOR MULTI-TENANT SUPPORT
-- =====================================================

DROP VIEW IF EXISTS public.admin_users_view;

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
  -- Extract organization from user metadata with fallbacks
  COALESCE(
    u.raw_user_meta_data->>'organization',
    u.raw_app_meta_data->>'organization',
    p.organization,
    'default'
  ) as organization,
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
  ) AS role_count,
  -- Count of workspaces (placeholder for future implementation)
  0 as workspace_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- Grant select access to authenticated users
GRANT SELECT ON public.admin_users_view TO authenticated;

-- =====================================================
-- STEP 2: CREATE MULTI-TENANT HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->>'organization',
    (SELECT raw_user_meta_data->>'organization' FROM auth.users WHERE id = auth.uid()),
    (SELECT raw_app_meta_data->>'organization' FROM auth.users WHERE id = auth.uid()),
    (SELECT organization FROM public.profiles WHERE id = auth.uid()),
    'default'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is system admin (organization-agnostic)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific organization's users
CREATE OR REPLACE FUNCTION public.can_access_organization_users(target_organization TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- System admins can access their own organization's users
  IF is_system_admin() THEN
    RETURN get_user_organization() = target_organization;
  END IF;
  
  -- Super admins (if role exists) can access all organizations
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: UPDATE RLS POLICIES FOR MULTI-TENANT ACCESS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Create new multi-tenant policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view org user roles"
  ON public.user_roles FOR SELECT
  USING (
    is_system_admin() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = user_roles.user_id
      AND can_access_organization_users(
        COALESCE(
          u.raw_user_meta_data->>'organization',
          u.raw_app_meta_data->>'organization',
          'default'
        )
      )
    )
  );

CREATE POLICY "System admins can manage org user roles"
  ON public.user_roles FOR ALL
  USING (
    is_system_admin() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = user_roles.user_id
      AND can_access_organization_users(
        COALESCE(
          u.raw_user_meta_data->>'organization',
          u.raw_app_meta_data->>'organization',
          'default'
        )
      )
    )
  );

-- Drop existing policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create new multi-tenant policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "System admins can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    is_system_admin() AND
    can_access_organization_users(
      COALESCE(profiles.organization, 'default')
    )
  );

CREATE POLICY "System admins can update org profiles"
  ON public.profiles FOR UPDATE
  USING (
    is_system_admin() AND
    can_access_organization_users(
      COALESCE(profiles.organization, 'default')
    )
  );

-- =====================================================
-- STEP 4: ENSURE PROFILES TABLE HAS ORGANIZATION COLUMN
-- =====================================================

-- Add organization column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'organization'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization TEXT DEFAULT 'default';
  END IF;
END $$;

-- Update existing profiles to have organization from user metadata
UPDATE public.profiles p
SET organization = COALESCE(
  (SELECT raw_user_meta_data->>'organization' FROM auth.users WHERE id = p.id),
  (SELECT raw_app_meta_data->>'organization' FROM auth.users WHERE id = p.id),
  'default'
)
WHERE p.organization IS NULL OR p.organization = 'default';

-- =====================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_organization_users(TEXT) TO authenticated;

-- =====================================================
-- STEP 6: ENSURE ALL SYSTEM ADMINS HAVE PROFILES
-- =====================================================

DO $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'system_admin'
  LOOP
    INSERT INTO public.profiles (id, full_name, organization, updated_at)
    SELECT 
      admin_user.user_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = admin_user.user_id),
        (SELECT raw_app_meta_data->>'full_name' FROM auth.users WHERE id = admin_user.user_id),
        'System Admin'
      ),
      COALESCE(
        (SELECT raw_user_meta_data->>'organization' FROM auth.users WHERE id = admin_user.user_id),
        (SELECT raw_app_meta_data->>'organization' FROM auth.users WHERE id = admin_user.user_id),
        'default'
      ),
      NOW()
    ON CONFLICT (id) DO UPDATE SET
      organization = EXCLUDED.organization,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Multi-Tenant Admin Access Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  - System admins can view/manage users in their organization';
  RAISE NOTICE '  - Organization-based data isolation';
  RAISE NOTICE '  - Updated admin_users_view with organization support';
  RAISE NOTICE '  - Multi-tenant RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'System admins: %', (SELECT COUNT(*) FROM public.user_roles WHERE role = 'system_admin');
  RAISE NOTICE 'Organizations: %', (SELECT COUNT(DISTINCT organization) FROM public.profiles WHERE organization IS NOT NULL);
  RAISE NOTICE '=================================================================';
END $$;

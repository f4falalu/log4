-- =====================================================
-- Fix User Roles RLS Infinite Recursion
-- =====================================================
-- Problem: Current user_roles policies query user_roles
-- inside their USING clause, causing infinite recursion
-- and 500 errors.
--
-- Solution: Use the existing has_role() SECURITY DEFINER
-- function which bypasses RLS when checking roles.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP EXISTING RECURSIVE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- =====================================================
-- 2. CREATE has_role() HELPER FUNCTION (if missing)
-- =====================================================

-- Check and create has_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = role_name
  );
END;
$$;

COMMENT ON FUNCTION public.has_role(TEXT) IS
'SECURITY DEFINER function that bypasses RLS to check if current user has a specific role. Used in RLS policies to prevent infinite recursion.';

-- =====================================================
-- 3. CREATE NON-RECURSIVE POLICIES USING has_role()
-- =====================================================

-- Users can always view their own roles (no recursion)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- System admins can view all user roles (uses SECURITY DEFINER function)
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role('system_admin'));

-- System admins can manage user roles (insert, update, delete)
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role('system_admin'));

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_roles';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'User Roles RLS Recursion Fixed!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed policies:';
  RAISE NOTICE '  - Users can view own roles (SELECT, no recursion)';
  RAISE NOTICE '  - Admins can view all (uses has_role SECURITY DEFINER)';
  RAISE NOTICE '  - Admins can manage (uses has_role SECURITY DEFINER)';
  RAISE NOTICE '';
  RAISE NOTICE 'The has_role() function bypasses RLS, preventing infinite loops';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;

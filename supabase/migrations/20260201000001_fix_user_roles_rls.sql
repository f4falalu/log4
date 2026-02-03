-- =====================================================
-- Fix User Roles RLS Policies
-- =====================================================
-- The user_roles table has RLS enabled but no policies,
-- causing 400 errors when querying tables that depend on
-- role-checking functions.
--
-- Note: The has_role() function is SECURITY DEFINER so it
-- bypasses RLS, but direct queries to user_roles still need policies.

-- =====================================================
-- 1. DROP EXISTING POLICIES (IF ANY)
-- =====================================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- =====================================================
-- 2. CREATE RLS POLICIES FOR USER_ROLES
-- =====================================================

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- System admins can view all user roles (using direct check to avoid recursion)
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'system_admin'
    )
  );

-- System admins can manage user roles
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'system_admin'
    )
  );

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'User Roles RLS Policies Added';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created policies:';
  RAISE NOTICE '  - Users can view own roles (SELECT own records)';
  RAISE NOTICE '  - System admins can view all user roles (SELECT all)';
  RAISE NOTICE '  - System admins can manage user roles (ALL operations)';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: has_role() function is SECURITY DEFINER and bypasses RLS.';
  RAISE NOTICE 'These policies are for direct queries to user_roles table.';
  RAISE NOTICE '=================================================================';
END $$;

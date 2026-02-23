-- =====================================================
-- Fix has_role() Function for New RBAC Schema
-- =====================================================
-- Problem: has_role() still checks deprecated user_roles.role
-- enum column instead of new role_id FK to roles table.
--
-- This causes RLS policies to fail because the old role
-- column may not be populated for newly assigned roles.
--
-- Solution: Update has_role() to check role_id via JOIN
-- =====================================================

BEGIN;

-- =====================================================
-- UPDATE has_role() FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(role_code_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.code = role_code_param
  );
END;
$$;

COMMENT ON FUNCTION public.has_role(TEXT) IS
'SECURITY DEFINER function that checks if current user has a specific role using the new role_id FK. Bypasses RLS to prevent infinite recursion.';

-- =====================================================
-- UPDATE RLS POLICIES TO USE NEW SCHEMA
-- =====================================================

-- Update roles table policies
DROP POLICY IF EXISTS "System admins can manage roles" ON public.roles;

CREATE POLICY "System admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.code = 'system_admin'
    )
  );

-- Update role_permissions table policies
DROP POLICY IF EXISTS "System admins can manage role permissions" ON public.role_permissions;

CREATE POLICY "System admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.code = 'system_admin'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  has_admin_role BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Count how many system_admin role assignments exist
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.code = 'system_admin';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'has_role() Function Updated for New RBAC Schema';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'System admin role assignments found: %', admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Updated components:';
  RAISE NOTICE '  ✅ has_role() function now checks role_id (not deprecated role column)';
  RAISE NOTICE '  ✅ RLS policies on roles table updated';
  RAISE NOTICE '  ✅ RLS policies on role_permissions table updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Old role column is deprecated and will be removed in future.';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;

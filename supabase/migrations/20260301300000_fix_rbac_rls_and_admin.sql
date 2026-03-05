-- ============================================================================
-- Fix RBAC RLS & Admin Access
-- ============================================================================
-- Problem: Admin user gets "Access denied: system_admin role required" when
-- accessing /admin/members. Root causes:
--   1. has_role(TEXT) checks old `role` enum column, not `role_id` FK
--   2. RLS policies on user_roles/roles use has_role() which may check stale data
--   3. Old `role` enum and new `role_id` FK are out of sync
--   4. Direct table mutations (assign/remove role) get blocked by RLS
--
-- Fix: Rebuild has_role/is_system_admin to use role_id JOIN, fix RLS policies,
-- backfill old column, add sync trigger, create admin RPCs.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. ENSURE SYSTEM ROLES EXIST (idempotent)
-- ============================================================
INSERT INTO public.roles (name, code, description, is_system_role)
VALUES
  ('System Administrator', 'system_admin', 'Full system access with all permissions', true),
  ('Operations User', 'operations_user', 'Handles planning, inventory, requisitions, and invoices', true),
  ('FleetOps User', 'fleetops_user', 'Handles batch creation, assignment, and dispatch', true),
  ('Driver', 'driver', 'Mobile execution: view assigned routes and confirm deliveries', true),
  ('Viewer', 'viewer', 'Read-only access to reports and data', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. FIX has_role() — use role_id JOIN, not old enum column
-- ============================================================

-- Drop existing overloads to avoid ambiguity
DROP FUNCTION IF EXISTS public.has_role(TEXT);
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);

-- Single-arg version (current user)
CREATE OR REPLACE FUNCTION public.has_role(_role_code TEXT)
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
      AND r.code = _role_code
  );
$$;

COMMENT ON FUNCTION public.has_role(TEXT) IS
  'Check if current user has a role by code. SECURITY DEFINER to bypass RLS.';

-- Two-arg version (any user)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role_code TEXT)
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
    WHERE ur.user_id = _user_id
      AND r.code = _role_code
  );
$$;

COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS
  'Check if a specific user has a role by code. SECURITY DEFINER to bypass RLS.';

-- ============================================================
-- 3. FIX is_system_admin() — delegate to fixed has_role()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id UUID)
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
    WHERE ur.user_id = _user_id
      AND r.code = 'system_admin'
  );
$$;

-- ============================================================
-- 4. FIX get_my_roles() — ensure it exists and works
-- ============================================================

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

GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- ============================================================
-- 5. BACKFILL role_id FROM old role enum (for unmigrated records)
-- ============================================================

UPDATE public.user_roles ur
SET role_id = r.id
FROM public.roles r
WHERE ur.role_id IS NULL
  AND (
    (ur.role::text = 'system_admin' AND r.code = 'system_admin')
    OR (ur.role::text = 'warehouse_officer' AND r.code = 'operations_user')
    OR (ur.role::text = 'zonal_manager' AND r.code = 'fleetops_user')
    OR (ur.role::text = 'driver' AND r.code = 'driver')
    OR (ur.role::text = 'viewer' AND r.code = 'viewer')
  );

-- ============================================================
-- 6. BACKFILL old role enum FROM role_id (for records that
--    have role_id but stale/NULL role enum)
-- ============================================================

UPDATE public.user_roles ur
SET role = (
  CASE r.code
    WHEN 'system_admin' THEN 'system_admin'
    WHEN 'operations_user' THEN 'warehouse_officer'
    WHEN 'fleetops_user' THEN 'zonal_manager'
    WHEN 'driver' THEN 'driver'
    WHEN 'viewer' THEN 'viewer'
  END
)::app_role
FROM public.roles r
WHERE r.id = ur.role_id
  AND (
    ur.role IS NULL
    OR ur.role::text != CASE r.code
      WHEN 'system_admin' THEN 'system_admin'
      WHEN 'operations_user' THEN 'warehouse_officer'
      WHEN 'fleetops_user' THEN 'zonal_manager'
      WHEN 'driver' THEN 'driver'
      WHEN 'viewer' THEN 'viewer'
    END
  );

-- ============================================================
-- 7. SYNC TRIGGER — keep old role enum in sync with role_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_user_role_enum()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role_id IS NOT NULL THEN
    NEW.role := (
      SELECT CASE r.code
        WHEN 'system_admin' THEN 'system_admin'::app_role
        WHEN 'operations_user' THEN 'warehouse_officer'::app_role
        WHEN 'fleetops_user' THEN 'zonal_manager'::app_role
        WHEN 'driver' THEN 'driver'::app_role
        WHEN 'viewer' THEN 'viewer'::app_role
      END
      FROM public.roles r WHERE r.id = NEW.role_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_role_enum_on_change ON public.user_roles;
CREATE TRIGGER sync_role_enum_on_change
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_enum();

-- ============================================================
-- 8. FIX RLS POLICIES ON user_roles
-- ============================================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;

-- Users can view their own roles (no recursion — direct uid check)
CREATE POLICY "users_view_own_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System admins can view all user roles (SECURITY DEFINER breaks recursion)
CREATE POLICY "admins_view_all_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- System admins can insert user roles
CREATE POLICY "admins_insert_roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

-- System admins can update user roles
CREATE POLICY "admins_update_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- System admins can delete user roles
CREATE POLICY "admins_delete_roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- ============================================================
-- 9. FIX RLS POLICIES ON roles TABLE
-- ============================================================

DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "System admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "System admins can insert roles" ON public.roles;
DROP POLICY IF EXISTS "System admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "System admins can delete roles" ON public.roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.roles;

-- Everyone can read roles
CREATE POLICY "authenticated_view_roles"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system admins can modify roles
CREATE POLICY "admins_insert_roles"
  ON public.roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "admins_update_roles"
  ON public.roles
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "admins_delete_roles"
  ON public.roles
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin(auth.uid()));

-- ============================================================
-- 10. CREATE ADMIN RPCs (bypass RLS for admin operations)
-- ============================================================

-- Assign a role to a user
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id UUID,
  _role_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id UUID;
BEGIN
  -- Verify caller is system admin
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system_admin role required';
  END IF;

  -- Find the role
  SELECT id INTO _role_id FROM public.roles WHERE code = _role_code;
  IF _role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', _role_code;
  END IF;

  -- Insert (ignore if already assigned)
  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (_target_user_id, _role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_role(UUID, TEXT) TO authenticated;

-- Remove a role from a user
CREATE OR REPLACE FUNCTION public.admin_remove_role(
  _target_user_id UUID,
  _role_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id UUID;
BEGIN
  -- Verify caller is system admin
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system_admin role required';
  END IF;

  -- Find the role
  SELECT id INTO _role_id FROM public.roles WHERE code = _role_code;
  IF _role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', _role_code;
  END IF;

  -- Remove
  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role_id = _role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_role(UUID, TEXT) TO authenticated;

-- Get roles for any user (admin view)
CREATE OR REPLACE FUNCTION public.admin_get_user_roles(_target_user_id UUID)
RETURNS TABLE(role_id UUID, role_code TEXT, role_name TEXT, role_description TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.code, r.name, r.description
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = _target_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_roles(UUID) TO authenticated;

COMMIT;

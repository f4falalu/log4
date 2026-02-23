-- =====================================================
-- Fix infinite recursion in roles table RLS policy
-- =====================================================
-- Issue: "System admins can manage roles" policy JOINs
-- the roles table to check if user is system_admin,
-- causing infinite recursion when querying roles.
--
-- Solution: Check user_roles.role enum directly without
-- joining roles table.
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "System admins can manage roles" ON roles;

-- Create new policies that don't cause recursion
-- For INSERT, UPDATE, DELETE: check user_roles.role directly
CREATE POLICY "System admins can insert roles"
  ON roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text = 'system_admin'
    )
  );

CREATE POLICY "System admins can update roles"
  ON roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text = 'system_admin'
    )
  );

CREATE POLICY "System admins can delete roles"
  ON roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text = 'system_admin'
    )
  );

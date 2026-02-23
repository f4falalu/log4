-- =====================================================
-- Add RLS policies for profiles table
-- =====================================================
-- Issue: profiles table has RLS enabled but NO policies,
-- causing all access to be denied by default (400 errors)
-- when trying to embed profiles in workspace_members queries.
--
-- Solution: Add policies to allow:
-- 1. Users to read their own profile
-- 2. System admins to read/update all profiles
-- 3. Users to read profiles of members in the same workspace
-- =====================================================

-- Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "System admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in same workspace" ON profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: System admins can view all profiles
CREATE POLICY "System admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text = 'system_admin'
    )
  );

-- Policy 4: System admins can update all profiles
CREATE POLICY "System admins can update all profiles"
  ON profiles
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

-- Policy 5: Users can view profiles of members in the same workspace
-- This enables workspace_members { *, profiles(*) } queries
CREATE POLICY "Users can view profiles in same workspace"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      INNER JOIN workspace_members wm2
        ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view own profile" ON profiles IS
  'Allow users to view their own profile data';

COMMENT ON POLICY "Users can update own profile" ON profiles IS
  'Allow users to update their own profile data';

COMMENT ON POLICY "System admins can view all profiles" ON profiles IS
  'Allow system admins to view all user profiles for admin pages';

COMMENT ON POLICY "System admins can update all profiles" ON profiles IS
  'Allow system admins to update any user profile for admin management';

COMMENT ON POLICY "Users can view profiles in same workspace" ON profiles IS
  'Allow users to view profiles of other members in the same workspace (enables workspace_members embedded selects)';

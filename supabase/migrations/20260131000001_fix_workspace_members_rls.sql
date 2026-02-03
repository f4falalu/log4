-- =====================================================
-- Fix Workspace Members RLS Infinite Recursion
-- =====================================================
-- The existing RLS policies on workspace_members reference the table
-- itself, causing infinite recursion. This migration fixes that by
-- using SECURITY DEFINER functions that bypass RLS.

-- =====================================================
-- 1. CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Check if user is member of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
  );
$$;

-- Check if user is admin/owner of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_admin(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

-- Check if user is owner of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_owner(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
$$;

-- Get all workspace IDs for current user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = p_user_id;
$$;

-- Get admin workspace IDs for current user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_admin_workspace_ids(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = p_user_id
    AND role IN ('owner', 'admin');
$$;

-- =====================================================
-- 2. DROP EXISTING PROBLEMATIC POLICIES
-- =====================================================

-- Drop old policy names
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON public.workspace_members;
-- Drop new policy names (in case migration was partially run before)
DROP POLICY IF EXISTS "Users can view own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;

-- =====================================================
-- 3. CREATE FIXED RLS POLICIES
-- =====================================================

-- Users can view their own membership records
CREATE POLICY "Users can view own memberships"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all members in workspaces they administer
-- Uses the helper function to avoid recursion
CREATE POLICY "Admins can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- Owners can add new members to their workspaces
CREATE POLICY "Owners can add workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    public.is_workspace_owner(workspace_id, auth.uid())
  );

-- Owners can update member roles in their workspaces
CREATE POLICY "Owners can update member roles"
  ON public.workspace_members FOR UPDATE
  USING (
    public.is_workspace_owner(workspace_id, auth.uid())
  );

-- Owners can remove members from their workspaces (except themselves)
CREATE POLICY "Owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    public.is_workspace_owner(workspace_id, auth.uid())
    AND user_id != auth.uid()
  );

-- =====================================================
-- 4. GRANT EXECUTE ON FUNCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_workspace_ids(UUID) TO authenticated;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspace Members RLS Fixed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created SECURITY DEFINER helper functions:';
  RAISE NOTICE '  - is_workspace_member(workspace_id, user_id)';
  RAISE NOTICE '  - is_workspace_admin(workspace_id, user_id)';
  RAISE NOTICE '  - is_workspace_owner(workspace_id, user_id)';
  RAISE NOTICE '  - get_user_workspace_ids(user_id)';
  RAISE NOTICE '  - get_user_admin_workspace_ids(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed RLS policies to use these functions instead of';
  RAISE NOTICE 'direct table queries, eliminating infinite recursion.';
  RAISE NOTICE '=================================================================';
END $$;

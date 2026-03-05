-- Fix critical data leak: workspaces SELECT policy uses USING(true)
-- which allows any authenticated user to see ALL workspaces across all organizations.
-- Replace with membership-scoped policy using existing SECURITY DEFINER helper.

-- Drop the permissive policy that leaks all workspace data
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;

-- Create properly scoped policy: users can only see workspaces they are members of
CREATE POLICY "Users can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    id = ANY(get_user_workspace_ids_array())
  );

-- Add a comment documenting the fix
COMMENT ON POLICY "Users can view their workspaces" ON public.workspaces IS
  'Users can only view workspaces they are members of. Fixed 2026-03-02 - was USING(true) which leaked all org data.';

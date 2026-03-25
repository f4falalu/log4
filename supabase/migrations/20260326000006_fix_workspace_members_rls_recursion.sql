-- ============================================================================
-- FIX: Workspace Members RLS Self-Referencing Recursion
-- ============================================================================
-- Migration 20260325000006 reintroduced a self-referencing EXISTS in the
-- SELECT policy on workspace_members, which causes infinite recursion
-- (the same bug migration 20260131000001 originally fixed).
--
-- Fix: use the SECURITY DEFINER function is_workspace_member_v2() instead
-- of directly querying workspace_members inside its own RLS policy.
-- ============================================================================

BEGIN;

-- Drop the broken self-referencing SELECT policy
DROP POLICY IF EXISTS "Active members can view workspace members" ON public.workspace_members;
-- Also drop legacy names in case they still exist
DROP POLICY IF EXISTS "Users can view own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can view workspace members" ON public.workspace_members;

-- Recreate using SECURITY DEFINER function (no recursion)
CREATE POLICY "Active members can view workspace members"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (
    -- Own membership row is always visible
    user_id = auth.uid()
    OR
    -- Any active member of the same workspace can see all members
    -- Uses SECURITY DEFINER function to avoid self-referencing recursion
    public.is_workspace_member_v2(workspace_id)
  );

-- Also fix INSERT policy which has the same self-referencing issue
DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
CREATE POLICY "Admins can add workspace members"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
    -- Allow first member insertion (create_workspace SECURITY DEFINER flow)
    OR NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
    )
  );

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- Fix DELETE policy
DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;
CREATE POLICY "Admins can remove workspace members"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
    -- Cannot remove the owner
    AND NOT EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = workspace_members.role_id
        AND r.code = 'owner'
    )
  );

COMMIT;

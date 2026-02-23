-- ============================================================================
-- Fix workspace_members to profiles FK constraint for PostgREST embedded selects
-- ============================================================================
-- Issue: workspace_members.user_id references auth.users, but we need to embed
-- profiles data. PostgREST requires a direct FK relationship for embedded selects.
-- Solution: Add FK constraint from workspace_members.user_id to profiles.id
-- (both reference auth.users.id, so this is valid and safe)
-- ============================================================================

-- Add foreign key constraint to enable PostgREST embedded select
-- This allows queries like: workspace_members { *, profiles(*) }
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

-- Re-add with cascade to profiles instead of auth.users
-- Note: profiles.id already has FK to auth.users, so this creates the chain:
-- workspace_members.user_id → profiles.id → auth.users.id
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON CONSTRAINT workspace_members_user_id_fkey ON public.workspace_members IS
  'FK to profiles enables PostgREST embedded selects for workspace member profile data';

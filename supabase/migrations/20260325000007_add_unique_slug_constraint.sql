-- ============================================================================
-- ADD UNIQUE CONSTRAINT ON workspaces.slug
-- ============================================================================
-- The create_workspace RPC already checks for slug uniqueness before insert,
-- but without a DB-level constraint there's a race condition window where two
-- concurrent requests could both pass the check and insert the same slug.
-- This constraint guarantees uniqueness at the database level.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspaces_slug_unique'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_slug_unique UNIQUE (slug);
  END IF;
END $$;

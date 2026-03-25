-- ============================================================================
-- Migration: Programs Workspace Isolation
-- ============================================================================
-- Adds workspace_id to programs table for complete data isolation.
-- Each workspace owns its own programs independently.
-- ============================================================================

-- =====================================================
-- 1. ADD workspace_id COLUMN (nullable first for backfill)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'programs' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.programs
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL existing programs to first active workspace
-- =====================================================

UPDATE public.programs
SET workspace_id = (
  SELECT id FROM public.workspaces
  WHERE is_active = TRUE
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- =====================================================
-- 3. MAKE NOT NULL after backfill
-- =====================================================

DO $$
BEGIN
  -- Only set NOT NULL if all rows have been backfilled
  IF NOT EXISTS (
    SELECT 1 FROM public.programs WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.programs ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 4. REPLACE UNIQUE CONSTRAINT on code
-- =====================================================
-- Drop global UNIQUE(code), replace with UNIQUE(workspace_id, code)
-- so two workspaces can both have program code "MAL-01"

DO $$
BEGIN
  -- Drop the old unique index on code if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'programs' AND indexname = 'programs_code_key'
  ) THEN
    ALTER TABLE public.programs DROP CONSTRAINT programs_code_key;
  END IF;

  -- Drop the old index on code if it exists
  DROP INDEX IF EXISTS public.idx_programs_code;
END $$;

-- Add scoped uniqueness constraint
ALTER TABLE public.programs
  ADD CONSTRAINT programs_workspace_code_unique UNIQUE (workspace_id, code);

-- =====================================================
-- 5. ADD INDEX on workspace_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_programs_workspace_id
  ON public.programs(workspace_id);

-- =====================================================
-- 6. REPLACE RLS POLICIES with workspace isolation
-- =====================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can create programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can delete programs" ON public.programs;

-- New workspace-isolated policies
CREATE POLICY "workspace_isolation_select"
  ON public.programs FOR SELECT TO authenticated
  USING (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_insert"
  ON public.programs FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_update"
  ON public.programs FOR UPDATE TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_delete"
  ON public.programs FOR DELETE TO authenticated
  USING (is_workspace_member_v2(workspace_id));

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'programs' AND column_name = 'workspace_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_id column not added to programs';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Programs Workspace Isolation Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added: programs.workspace_id (NOT NULL, FK to workspaces)';
  RAISE NOTICE 'Replaced: UNIQUE(code) → UNIQUE(workspace_id, code)';
  RAISE NOTICE 'Replaced: permissive RLS → workspace isolation via is_workspace_member_v2()';
  RAISE NOTICE '=================================================================';
END $$;

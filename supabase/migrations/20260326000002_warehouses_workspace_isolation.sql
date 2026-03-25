-- ============================================================================
-- Migration: Warehouses Workspace Isolation
-- ============================================================================
-- Adds workspace_id to warehouses table for complete data isolation.
-- ============================================================================

-- =====================================================
-- 1. ADD workspace_id COLUMN (nullable first for backfill)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.warehouses
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL existing warehouses to first active workspace
-- =====================================================

UPDATE public.warehouses
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
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.warehouses ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 4. ADD INDEX on workspace_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_warehouses_workspace_id
  ON public.warehouses(workspace_id);

-- =====================================================
-- 5. REPLACE RLS POLICIES with workspace isolation
-- =====================================================

-- Drop old policies (from multiple migration files)
DROP POLICY IF EXISTS "Allow all operations on warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Authenticated users can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouse officers can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins can manage warehouses" ON public.warehouses;

-- New workspace-isolated policies
CREATE POLICY "workspace_isolation_select"
  ON public.warehouses FOR SELECT TO authenticated
  USING (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_insert"
  ON public.warehouses FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_update"
  ON public.warehouses FOR UPDATE TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_delete"
  ON public.warehouses FOR DELETE TO authenticated
  USING (is_workspace_member_v2(workspace_id));

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'workspace_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_id column not added to warehouses';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Warehouses Workspace Isolation Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added: warehouses.workspace_id (NOT NULL, FK to workspaces)';
  RAISE NOTICE 'Replaced: role-based RLS → workspace isolation via is_workspace_member_v2()';
  RAISE NOTICE '=================================================================';
END $$;

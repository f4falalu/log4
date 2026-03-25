-- ============================================================================
-- Migration: Items Workspace Isolation
-- ============================================================================
-- Adds workspace_id to items table for complete data isolation.
-- Backfills from warehouses.workspace_id via FK chain.
-- ============================================================================

-- =====================================================
-- 1. ADD workspace_id COLUMN (nullable first for backfill)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.items
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL from warehouses.workspace_id via FK chain
-- =====================================================

-- Items with a warehouse_id: inherit workspace from warehouse
UPDATE public.items i
SET workspace_id = w.workspace_id
FROM public.warehouses w
WHERE i.warehouse_id = w.id
  AND i.workspace_id IS NULL
  AND w.workspace_id IS NOT NULL;

-- Items without a warehouse_id (or warehouse has no workspace): assign to first active workspace
UPDATE public.items
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
    SELECT 1 FROM public.items WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.items ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 4. ADD INDEX on workspace_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_items_workspace_id
  ON public.items(workspace_id);

-- =====================================================
-- 5. REPLACE RLS POLICIES with workspace isolation
-- =====================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Items are viewable by authenticated users" ON public.items;
DROP POLICY IF EXISTS "Items can be created by authenticated users" ON public.items;
DROP POLICY IF EXISTS "Items can be updated by authenticated users" ON public.items;
DROP POLICY IF EXISTS "Items can be deleted by authenticated users" ON public.items;

-- New workspace-isolated policies
CREATE POLICY "workspace_isolation_select"
  ON public.items FOR SELECT TO authenticated
  USING (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_insert"
  ON public.items FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_update"
  ON public.items FOR UPDATE TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

CREATE POLICY "workspace_isolation_delete"
  ON public.items FOR DELETE TO authenticated
  USING (is_workspace_member_v2(workspace_id));

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'workspace_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_id column not added to items';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Items Workspace Isolation Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added: items.workspace_id (NOT NULL, FK to workspaces)';
  RAISE NOTICE 'Backfilled: from warehouses.workspace_id via FK chain';
  RAISE NOTICE 'Replaced: permissive RLS → workspace isolation via is_workspace_member_v2()';
  RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- Migration: Workspace LGAs Junction Table
-- ============================================================================
-- Creates workspace_lgas junction table and save_workspace_lgas RPC,
-- following the exact pattern of workspace_states (from 20260222200000).
-- Enables Country → State → LGA geographic scoping per workspace.
-- ============================================================================

-- =====================================================
-- 1. CREATE workspace_lgas JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_lgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  admin_unit_id UUID NOT NULL REFERENCES public.admin_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, admin_unit_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workspace_lgas_workspace
  ON public.workspace_lgas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_lgas_admin_unit
  ON public.workspace_lgas(admin_unit_id);

-- Comments
COMMENT ON TABLE public.workspace_lgas IS 'Junction table linking workspaces to their operational LGAs (admin_level 6)';

-- =====================================================
-- 2. ENABLE RLS
-- =====================================================

ALTER TABLE public.workspace_lgas ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can view their workspace's LGAs
CREATE POLICY "workspace_lgas_select_policy"
  ON public.workspace_lgas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_lgas.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace owners/admins can manage LGAs
CREATE POLICY "workspace_lgas_insert_policy"
  ON public.workspace_lgas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_lgas.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_lgas_delete_policy"
  ON public.workspace_lgas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_lgas.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. CREATE save_workspace_lgas RPC
-- =====================================================
-- Follows exact pattern of save_workspace_states

CREATE OR REPLACE FUNCTION save_workspace_lgas(
  p_workspace_id UUID,
  p_admin_unit_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aid UUID;
BEGIN
  -- Verify caller is workspace owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only workspace owners/admins can update workspace LGAs';
  END IF;

  -- Clear existing LGAs for this workspace
  DELETE FROM workspace_lgas WHERE workspace_id = p_workspace_id;

  -- Insert new LGAs
  IF p_admin_unit_ids IS NOT NULL AND array_length(p_admin_unit_ids, 1) > 0 THEN
    FOREACH v_aid IN ARRAY p_admin_unit_ids
    LOOP
      INSERT INTO workspace_lgas (workspace_id, admin_unit_id)
      VALUES (p_workspace_id, v_aid)
      ON CONFLICT (workspace_id, admin_unit_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION save_workspace_lgas TO authenticated;

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_lgas'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_lgas table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'save_workspace_lgas'
  ) THEN
    RAISE EXCEPTION 'Migration failed: save_workspace_lgas function not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspace LGAs Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created: workspace_lgas table with RLS';
  RAISE NOTICE 'Created: save_workspace_lgas RPC (SECURITY DEFINER)';
  RAISE NOTICE 'Hierarchy: workspace_countries → workspace_states → workspace_lgas';
  RAISE NOTICE '=================================================================';
END $$;

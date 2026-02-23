-- ============================================================================
-- Migration: Onboarding V2 Schema Extensions
-- ============================================================================
-- Adds new columns to workspaces table for enhanced organization setup,
-- creates junction tables for multi-country/state support,
-- and adds onboarding step tracking for resumable wizard.
-- ============================================================================

-- =====================================================
-- 1. EXTEND WORKSPACES TABLE
-- =====================================================

-- Organization type (e.g., NGO, Government, Private)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS org_type TEXT;

-- Industry sector
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS sector TEXT;

-- Fax number (optional contact)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS fax TEXT;

-- Track current onboarding wizard step for resumability
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS onboarding_current_step TEXT DEFAULT 'organization';

-- Add comments
COMMENT ON COLUMN public.workspaces.org_type IS 'Organization type: ngo, government, private, pharma_distributor, other';
COMMENT ON COLUMN public.workspaces.sector IS 'Industry sector: health, logistics, agriculture, retail, other';
COMMENT ON COLUMN public.workspaces.fax IS 'Optional fax number for organization contact';
COMMENT ON COLUMN public.workspaces.onboarding_current_step IS 'Current step in onboarding wizard for resumability';

-- =====================================================
-- 2. MULTI-COUNTRY SUPPORT (Junction Table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, country_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workspace_countries_workspace
  ON public.workspace_countries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_countries_country
  ON public.workspace_countries(country_id);

-- Comments
COMMENT ON TABLE public.workspace_countries IS 'Junction table linking workspaces to their operational countries';
COMMENT ON COLUMN public.workspace_countries.is_primary IS 'Whether this is the primary operational country';

-- Enable RLS
ALTER TABLE public.workspace_countries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can view their workspace's countries
CREATE POLICY "workspace_countries_select_policy"
  ON public.workspace_countries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_countries.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace owners/admins can manage countries
CREATE POLICY "workspace_countries_insert_policy"
  ON public.workspace_countries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_countries.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_countries_delete_policy"
  ON public.workspace_countries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_countries.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. MULTI-STATE SUPPORT (Junction Table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  admin_unit_id UUID NOT NULL REFERENCES public.admin_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, admin_unit_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workspace_states_workspace
  ON public.workspace_states(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_states_admin_unit
  ON public.workspace_states(admin_unit_id);

-- Comments
COMMENT ON TABLE public.workspace_states IS 'Junction table linking workspaces to their operational states/regions';

-- Enable RLS
ALTER TABLE public.workspace_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can view their workspace's states
CREATE POLICY "workspace_states_select_policy"
  ON public.workspace_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_states.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Workspace owners/admins can manage states
CREATE POLICY "workspace_states_insert_policy"
  ON public.workspace_states
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_states.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_states_delete_policy"
  ON public.workspace_states
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_states.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Verify workspaces columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'org_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: org_type column not added to workspaces';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'onboarding_current_step'
  ) THEN
    RAISE EXCEPTION 'Migration failed: onboarding_current_step column not added to workspaces';
  END IF;

  -- Verify junction tables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_countries'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_countries table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_states'
  ) THEN
    RAISE EXCEPTION 'Migration failed: workspace_states table not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Onboarding V2 Schema Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added columns: workspaces.org_type, sector, fax, onboarding_current_step';
  RAISE NOTICE 'Created tables: workspace_countries, workspace_states';
  RAISE NOTICE 'RLS enabled on both junction tables';
  RAISE NOTICE '=================================================================';
END $$;

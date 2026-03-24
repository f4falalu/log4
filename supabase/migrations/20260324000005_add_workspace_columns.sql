-- ============================================================================
-- PHASE 3.1: ADD workspace_id COLUMNS TO OPERATIONAL TABLES
-- ============================================================================

BEGIN;

-- Helper: adds workspace_id + index if not already present
-- We use DO blocks for idempotency.

-- ============================================================
-- requisitions
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requisitions' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.requisitions ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_requisitions_workspace_id ON public.requisitions(workspace_id);

-- ============================================================
-- delivery_batches
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_batches' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.delivery_batches ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_delivery_batches_workspace_id ON public.delivery_batches(workspace_id);

-- ============================================================
-- drivers
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_drivers_workspace_id ON public.drivers(workspace_id);

-- ============================================================
-- vehicles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.vehicles ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_vehicles_workspace_id ON public.vehicles(workspace_id);

-- ============================================================
-- invoices
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON public.invoices(workspace_id);

-- ============================================================
-- scheduler_batches (scheduler_pre_batches)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scheduler_pre_batches' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.scheduler_pre_batches ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_scheduler_pre_batches_workspace_id ON public.scheduler_pre_batches(workspace_id);

COMMIT;

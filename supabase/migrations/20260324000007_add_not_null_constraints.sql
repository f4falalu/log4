-- ============================================================================
-- PHASE 3.4: ADD NOT NULL CONSTRAINTS + COMPOSITE INDEXES
-- ============================================================================
-- Only adds NOT NULL after verifying no NULLs remain.
-- ============================================================================

BEGIN;

-- ============================================================
-- NOT NULL CONSTRAINTS (conditional — only if no NULLs remain)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.requisitions WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.requisitions ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.delivery_batches WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.delivery_batches ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.invoices ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.drivers ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.vehicles ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.scheduler_pre_batches WHERE workspace_id IS NULL) THEN
    ALTER TABLE public.scheduler_pre_batches ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- COMPOSITE INDEXES for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_requisitions_ws_status ON public.requisitions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_ws_status ON public.delivery_batches(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_ws_status ON public.invoices(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_drivers_ws ON public.drivers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_ws ON public.vehicles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_pre_batches_ws_status ON public.scheduler_pre_batches(workspace_id, status);

COMMIT;

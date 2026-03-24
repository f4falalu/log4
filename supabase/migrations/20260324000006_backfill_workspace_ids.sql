-- ============================================================================
-- PHASE 3.2: BACKFILL workspace_id ON OPERATIONAL TABLES
-- ============================================================================
-- Traces workspace_id from related records (facility, warehouse, etc.)
-- Falls back to first active workspace for orphaned records.
-- ============================================================================

BEGIN;

-- Get default workspace ID for fallback
DO $$
DECLARE
  _default_ws UUID;
BEGIN
  SELECT id INTO _default_ws
  FROM public.workspaces
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF _default_ws IS NULL THEN
    RAISE NOTICE 'No active workspace found — skipping backfill';
    RETURN;
  END IF;

  -- ============================================================
  -- requisitions ← facility.workspace_id
  -- ============================================================
  UPDATE public.requisitions r
  SET workspace_id = f.workspace_id
  FROM public.facilities f
  WHERE r.facility_id = f.id
    AND r.workspace_id IS NULL
    AND f.workspace_id IS NOT NULL;

  -- Fallback for remaining NULLs
  UPDATE public.requisitions
  SET workspace_id = _default_ws
  WHERE workspace_id IS NULL;

  -- ============================================================
  -- delivery_batches ← default workspace (no direct facility FK)
  -- ============================================================
  UPDATE public.delivery_batches
  SET workspace_id = _default_ws
  WHERE workspace_id IS NULL;

  -- ============================================================
  -- invoices ← requisition.workspace_id
  -- ============================================================
  UPDATE public.invoices i
  SET workspace_id = r.workspace_id
  FROM public.requisitions r
  WHERE i.requisition_id = r.id
    AND i.workspace_id IS NULL
    AND r.workspace_id IS NOT NULL;

  -- Fallback
  UPDATE public.invoices
  SET workspace_id = _default_ws
  WHERE workspace_id IS NULL;

  -- ============================================================
  -- drivers ← default workspace
  -- ============================================================
  UPDATE public.drivers
  SET workspace_id = _default_ws
  WHERE workspace_id IS NULL;

  -- ============================================================
  -- vehicles ← most frequent delivery_batch workspace
  -- ============================================================
  UPDATE public.vehicles v
  SET workspace_id = sub.ws_id
  FROM (
    SELECT db.vehicle_id, db.workspace_id AS ws_id,
           ROW_NUMBER() OVER (PARTITION BY db.vehicle_id ORDER BY COUNT(*) DESC) AS rn
    FROM public.delivery_batches db
    WHERE db.vehicle_id IS NOT NULL
      AND db.workspace_id IS NOT NULL
    GROUP BY db.vehicle_id, db.workspace_id
  ) sub
  WHERE v.id = sub.vehicle_id
    AND sub.rn = 1
    AND v.workspace_id IS NULL;

  -- Fallback
  UPDATE public.vehicles
  SET workspace_id = _default_ws
  WHERE workspace_id IS NULL;

  -- ============================================================
  -- scheduler_pre_batches — already has workspace_id NOT NULL
  -- from its creation migration, no backfill needed.
  -- ============================================================

END $$;

COMMIT;

-- =========================================================================
-- Add gross_weight_kg to canonical vehicles table
-- =========================================================================
-- Purpose:
--   The VLMS Vehicle Configurator currently inserts into `vehicles` using the
--   field name `gross_weight_kg`. The canonical vehicles schema introduced
--   `gross_vehicle_weight_kg` instead, which causes PostgREST (PGRST204)
--   errors: "Could not find the 'gross_weight_kg' column of 'vehicles'".
--
-- Strategy:
--   Add `gross_weight_kg` as a compatibility column.
--   Keep existing `gross_vehicle_weight_kg` for backward compatibility.
--
-- Notes:
--   We do not attempt to backfill between the two columns automatically here.
--   If you want, we can add triggers later to keep them in sync.
-- =========================================================================

BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS gross_weight_kg numeric;

COMMENT ON COLUMN vehicles.gross_weight_kg IS 'Gross Vehicle Weight Rating (GVWR) in kilograms (compat column for VLMS UI payload)';

COMMIT;

-- -------------------------------------------------------------------------
-- Rollback
-- -------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS gross_weight_kg;
-- COMMIT;

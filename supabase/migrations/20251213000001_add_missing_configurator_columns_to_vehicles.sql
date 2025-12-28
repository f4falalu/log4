-- =========================================================================
-- Add missing VLMS Vehicle Configurator columns to canonical vehicles table
-- =========================================================================
-- Why:
--   VLMS UI (VehicleConfiguratorDialog) inserts into `vehicles` with fields
--   that exist on `vlms_vehicles` but not yet on canonical `vehicles`.
--   PostgREST rejects inserts with PGRST204 (missing column in schema cache).
--
-- Adds (compat columns):
--   - variant
--   - gross_weight_kg
--   - capacity_kg
--   - length_cm
--   - height_cm
--   - axles (alias for canonical number_of_axles)
--
-- Notes:
--   Canonical table already has: width_cm, capacity_m3, tiered_config,
--   number_of_axles, number_of_wheels, gross_vehicle_weight_kg.
--   We keep canonical columns and add compat aliases to match frontend.
-- =========================================================================

BEGIN;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS variant varchar(100),
  ADD COLUMN IF NOT EXISTS gross_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS capacity_kg numeric,
  ADD COLUMN IF NOT EXISTS length_cm int,
  ADD COLUMN IF NOT EXISTS height_cm int,
  ADD COLUMN IF NOT EXISTS axles int;

COMMENT ON COLUMN vehicles.variant IS 'Vehicle variant or trim level (compat column for VLMS UI payload)';
COMMENT ON COLUMN vehicles.gross_weight_kg IS 'Gross Vehicle Weight Rating (GVWR) in kilograms (compat column for VLMS UI payload)';
COMMENT ON COLUMN vehicles.capacity_kg IS 'Maximum payload capacity in kilograms (compat column for VLMS UI payload)';
COMMENT ON COLUMN vehicles.length_cm IS 'Cargo area inner length in centimeters (compat column for VLMS UI payload)';
COMMENT ON COLUMN vehicles.height_cm IS 'Cargo area inner height in centimeters (compat column for VLMS UI payload)';
COMMENT ON COLUMN vehicles.axles IS 'Number of axles (compat alias for number_of_axles)';

COMMIT;

-- -------------------------------------------------------------------------
-- Rollback
-- -------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE vehicles
--   DROP COLUMN IF EXISTS variant,
--   DROP COLUMN IF EXISTS gross_weight_kg,
--   DROP COLUMN IF EXISTS capacity_kg,
--   DROP COLUMN IF EXISTS length_cm,
--   DROP COLUMN IF EXISTS height_cm,
--   DROP COLUMN IF EXISTS axles;
-- COMMIT;

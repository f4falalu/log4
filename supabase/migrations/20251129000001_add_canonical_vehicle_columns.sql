-- ============================================================================
-- Vehicle Consolidation Audit - Step 1: Add Canonical Columns
-- ============================================================================
-- Purpose: Add missing columns from vlms_vehicles to vehicles table
-- Non-destructive: Only adds columns, does not modify existing data
-- Rollback: DROP COLUMN commands at end of file
-- ============================================================================

BEGIN;

-- Add missing dimension and capacity columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS width_cm int,
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS gross_vehicle_weight_kg int;

-- Add configuration columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS tiered_config jsonb DEFAULT '{}'::jsonb;

-- Add telematics columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS telematics_provider text,
  ADD COLUMN IF NOT EXISTS telematics_id text;

-- Add technical specification columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS number_of_axles int,
  ADD COLUMN IF NOT EXISTS number_of_wheels int;

-- Add acquisition and compliance columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS acquisition_mode text,
  ADD COLUMN IF NOT EXISTS date_acquired date;

-- Add legacy metadata for audit trail
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS legacy_metadata jsonb DEFAULT '{}'::jsonb;

-- Add column comments for documentation
COMMENT ON COLUMN vehicles.width_cm IS 'Vehicle width in centimeters';
COMMENT ON COLUMN vehicles.capacity_m3 IS 'Cargo capacity in cubic meters';
COMMENT ON COLUMN vehicles.gross_vehicle_weight_kg IS 'Maximum total weight including cargo (GVW)';
COMMENT ON COLUMN vehicles.tiered_config IS 'Multi-tier cargo configuration: {upper: n, middle: n, lower: n}';
COMMENT ON COLUMN vehicles.telematics_provider IS 'Telematics system provider (e.g., Geotab, Samsara, Verizon Connect)';
COMMENT ON COLUMN vehicles.telematics_id IS 'External telematics system vehicle identifier';
COMMENT ON COLUMN vehicles.number_of_axles IS 'Total number of axles on the vehicle';
COMMENT ON COLUMN vehicles.number_of_wheels IS 'Total number of wheels on the vehicle';
COMMENT ON COLUMN vehicles.acquisition_mode IS 'How vehicle was acquired: owned, leased, rented';
COMMENT ON COLUMN vehicles.date_acquired IS 'Date vehicle was acquired by organization';
COMMENT ON COLUMN vehicles.legacy_metadata IS 'Metadata from vlms_vehicles merge: vlms_id, conflicts, etc.';

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_vehicles_telematics_id
  ON vehicles(telematics_id)
  WHERE telematics_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_telematics_provider
  ON vehicles(telematics_provider)
  WHERE telematics_provider IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_acquisition_mode
  ON vehicles(acquisition_mode)
  WHERE acquisition_mode IS NOT NULL;

COMMIT;

-- ============================================================================
-- Rollback Script (run if migration needs to be reversed)
-- ============================================================================
--
-- BEGIN;
--
-- ALTER TABLE vehicles
--   DROP COLUMN IF EXISTS width_cm,
--   DROP COLUMN IF EXISTS capacity_m3,
--   DROP COLUMN IF EXISTS gross_vehicle_weight_kg,
--   DROP COLUMN IF EXISTS tiered_config,
--   DROP COLUMN IF EXISTS telematics_provider,
--   DROP COLUMN IF EXISTS telematics_id,
--   DROP COLUMN IF EXISTS number_of_axles,
--   DROP COLUMN IF EXISTS number_of_wheels,
--   DROP COLUMN IF EXISTS acquisition_mode,
--   DROP COLUMN IF EXISTS date_acquired,
--   DROP COLUMN IF EXISTS legacy_metadata;
--
-- DROP INDEX IF EXISTS idx_vehicles_telematics_id;
-- DROP INDEX IF EXISTS idx_vehicles_telematics_provider;
-- DROP INDEX IF EXISTS idx_vehicles_acquisition_mode;
--
-- COMMIT;

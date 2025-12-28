-- ===========================================================================
-- Add VLMS-compatible columns to vehicles table
-- ===========================================================================
-- Issue: VehicleConfiguratorDialog tries to insert `vehicle_type` and
--        `license_plate`, but vehicles table only has `type` and `plate_number`
-- Solution: Add compatibility columns to accept both naming conventions
-- ===========================================================================

BEGIN;

-- Add VLMS-compatible columns if they don't exist
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  ADD COLUMN IF NOT EXISTS make varchar(100),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS acquisition_type varchar(50),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255),
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS transmission varchar(50),
  ADD COLUMN IF NOT EXISTS interior_length_cm int,
  ADD COLUMN IF NOT EXISTS interior_width_cm int,
  ADD COLUMN IF NOT EXISTS interior_height_cm int,
  ADD COLUMN IF NOT EXISTS seating_capacity int,
  ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id varchar(50),
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS tiered_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Add comments
COMMENT ON COLUMN vehicles.vehicle_type IS 'VLMS compatibility - vehicle type string (sedan, truck, etc)';
COMMENT ON COLUMN vehicles.license_plate IS 'VLMS compatibility - license plate number';
COMMENT ON COLUMN vehicles.make IS 'Vehicle manufacturer (e.g., Toyota, Ford)';
COMMENT ON COLUMN vehicles.year IS 'Manufacturing year';
COMMENT ON COLUMN vehicles.acquisition_type IS 'How vehicle was acquired (purchase, lease, etc)';
COMMENT ON COLUMN vehicles.acquisition_date IS 'Date vehicle was acquired';
COMMENT ON COLUMN vehicles.transmission IS 'Transmission type (automatic, manual, etc)';
COMMENT ON COLUMN vehicles.current_mileage IS 'Current odometer reading';
COMMENT ON COLUMN vehicles.vehicle_id IS 'Human-readable vehicle identifier';
COMMENT ON COLUMN vehicles.capacity_m3 IS 'Cargo capacity in cubic meters';
COMMENT ON COLUMN vehicles.tiered_config IS 'Multi-tier cargo configuration (JSONB)';

-- Create unique constraint on vehicle_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_vehicle_id_key'
    ) THEN
        ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_id_key UNIQUE (vehicle_id);
    END IF;
END $$;

-- Create unique constraint on license_plate if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_license_plate_key'
    ) THEN
        ALTER TABLE vehicles ADD CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate);
    END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE vehicles
--   DROP COLUMN IF EXISTS vehicle_type,
--   DROP COLUMN IF EXISTS license_plate,
--   DROP COLUMN IF EXISTS make,
--   DROP COLUMN IF EXISTS year,
--   DROP COLUMN IF EXISTS acquisition_type,
--   DROP COLUMN IF EXISTS acquisition_date,
--   DROP COLUMN IF EXISTS vendor_name,
--   DROP COLUMN IF EXISTS registration_expiry,
--   DROP COLUMN IF EXISTS insurance_expiry,
--   DROP COLUMN IF EXISTS transmission,
--   DROP COLUMN IF EXISTS interior_length_cm,
--   DROP COLUMN IF EXISTS interior_width_cm,
--   DROP COLUMN IF EXISTS interior_height_cm,
--   DROP COLUMN IF EXISTS seating_capacity,
--   DROP COLUMN IF EXISTS current_mileage,
--   DROP COLUMN IF EXISTS vehicle_type_id,
--   DROP COLUMN IF EXISTS category_id,
--   DROP COLUMN IF EXISTS vehicle_id,
--   DROP COLUMN IF EXISTS capacity_m3,
--   DROP COLUMN IF EXISTS tiered_config,
--   DROP COLUMN IF EXISTS created_by,
--   DROP COLUMN IF EXISTS updated_by;
-- COMMIT;

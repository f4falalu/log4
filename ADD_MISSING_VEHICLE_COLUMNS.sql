-- =====================================================
-- ADD MISSING COLUMNS TO VEHICLES TABLE
-- =====================================================
-- This adds columns that the onboarding wizard expects
-- but are missing from the current vehicles table schema
-- =====================================================

BEGIN;

DO $$
BEGIN
  -- Add make column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'make'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN make VARCHAR(100);
  END IF;

  -- Add year column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'year'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN year INTEGER;
  END IF;

  -- Add license_plate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'license_plate'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN license_plate VARCHAR(20);
  END IF;

  -- Add vin column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vin'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vin VARCHAR(17);
  END IF;

  -- Add color column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'color'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN color VARCHAR(50);
  END IF;

  -- Add transmission column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'transmission'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN transmission VARCHAR(50);
  END IF;

  -- Add seating_capacity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'seating_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN seating_capacity INTEGER;
  END IF;

  -- Add engine_capacity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'engine_capacity'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN engine_capacity DECIMAL(10, 2);
  END IF;

  -- Add acquisition_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'acquisition_date'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN acquisition_date DATE;
  END IF;

  -- Add acquisition_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'acquisition_type'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN acquisition_type VARCHAR(50);
  END IF;

  -- Add purchase_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN purchase_price DECIMAL(15, 2);
  END IF;

  -- Add vendor_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vendor_name'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vendor_name VARCHAR(255);
  END IF;

  -- Add insurance_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_provider'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_provider VARCHAR(255);
  END IF;

  -- Add insurance_policy_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_policy_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_policy_number VARCHAR(100);
  END IF;

  -- Add insurance_expiry column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN insurance_expiry DATE;
  END IF;

  -- Add registration_expiry column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'registration_expiry'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN registration_expiry DATE;
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that all columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN (
  'make', 'year', 'license_plate', 'vin', 'color', 'transmission',
  'seating_capacity', 'engine_capacity', 'acquisition_date', 'acquisition_type',
  'purchase_price', 'vendor_name', 'insurance_provider', 'insurance_policy_number',
  'insurance_expiry', 'registration_expiry', 'notes'
)
ORDER BY column_name;

-- Success message
SELECT '✅ Missing columns added successfully! The vehicles table is now fully compatible with the onboarding wizard.' AS status;

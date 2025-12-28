-- =====================================================
-- FIX: Vehicles Table for Onboarding System
-- =====================================================
-- This migration adds onboarding columns to the existing 'vehicles' table
-- and creates supporting tables, functions, and triggers.
-- Run this in Supabase SQL Editor after vehicle_categories table exists.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add new columns to 'vehicles' table
-- =====================================================

DO $$
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN category_id uuid;
  END IF;

  -- Add vehicle_type_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_type_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_type_id uuid;
  END IF;

  -- Add capacity_m3 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'capacity_m3'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN capacity_m3 NUMERIC;
  END IF;

  -- Add capacity_kg column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'capacity_kg'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN capacity_kg NUMERIC;
  END IF;

  -- Add length_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'length_cm'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN length_cm INT;
  END IF;

  -- Add width_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'width_cm'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN width_cm INT;
  END IF;

  -- Add height_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN height_cm INT;
  END IF;

  -- Add tiered_config column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'tiered_config'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN tiered_config JSONB;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add foreign key constraints
-- =====================================================

DO $$
BEGIN
  -- Add foreign key for category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_category_id_fkey'
  ) THEN
    ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES vehicle_categories(id);
  END IF;

  -- Add foreign key for vehicle_type_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_vehicle_type_id_fkey'
  ) THEN
    ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_vehicle_type_id_fkey
      FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles(vehicle_type_id);

-- =====================================================
-- STEP 3: Update existing vehicle_types to link to categories
-- =====================================================

-- Map existing vehicle types to appropriate categories
UPDATE vehicle_types SET category_id = (SELECT id FROM vehicle_categories WHERE code = 'M1') WHERE name = 'car' AND category_id IS NULL;
UPDATE vehicle_types SET category_id = (SELECT id FROM vehicle_categories WHERE code = 'N1') WHERE name = 'pickup' AND category_id IS NULL;
UPDATE vehicle_types SET category_id = (SELECT id FROM vehicle_categories WHERE code = 'N2') WHERE name = 'truck' AND category_id IS NULL;
UPDATE vehicle_types SET category_id = (SELECT id FROM vehicle_categories WHERE code = 'N1') WHERE name = 'van' AND category_id IS NULL;

-- =====================================================
-- STEP 4: Create vehicle_tiers table
-- =====================================================

CREATE TABLE IF NOT EXISTS vehicle_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_order INT NOT NULL CHECK (tier_order > 0),
  max_weight_kg NUMERIC,
  max_volume_m3 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, tier_order),
  UNIQUE(vehicle_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle ON vehicle_tiers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_order ON vehicle_tiers(vehicle_id, tier_order);

-- =====================================================
-- STEP 5: Helper Functions
-- =====================================================

-- Function: Calculate volume from dimensions
CREATE OR REPLACE FUNCTION calculate_cargo_volume(length_cm INT, width_cm INT, height_cm INT)
RETURNS NUMERIC AS $$
BEGIN
  IF length_cm <= 0 OR width_cm <= 0 OR height_cm <= 0 THEN
    RAISE EXCEPTION 'Dimensions must be positive values';
  END IF;

  -- Convert cm to m and calculate volume, round to 2 decimal places
  RETURN ROUND((length_cm / 100.0) * (width_cm / 100.0) * (height_cm / 100.0), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Sync vehicle_tiers from tiered_config JSONB
CREATE OR REPLACE FUNCTION sync_vehicle_tiers_from_config(p_vehicle_id uuid, p_tiered_config jsonb)
RETURNS void AS $$
DECLARE
  tier_item jsonb;
BEGIN
  -- Delete existing tiers for this vehicle
  DELETE FROM vehicle_tiers WHERE vehicle_id = p_vehicle_id;

  -- Insert new tiers from JSONB config
  IF p_tiered_config IS NOT NULL AND jsonb_array_length(p_tiered_config) > 0 THEN
    FOR tier_item IN SELECT * FROM jsonb_array_elements(p_tiered_config)
    LOOP
      INSERT INTO vehicle_tiers (
        vehicle_id,
        tier_name,
        tier_order,
        max_weight_kg,
        max_volume_m3
      ) VALUES (
        p_vehicle_id,
        tier_item->>'tier_name',
        (tier_item->>'tier_order')::int,
        (tier_item->>'max_weight_kg')::numeric,
        (tier_item->>'max_volume_m3')::numeric
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate tier configuration
CREATE OR REPLACE FUNCTION validate_tier_config(p_tiered_config jsonb)
RETURNS boolean AS $$
DECLARE
  tier_item jsonb;
  tier_order_val int;
  expected_order int := 1;
BEGIN
  IF p_tiered_config IS NULL OR jsonb_array_length(p_tiered_config) = 0 THEN
    RETURN true; -- Empty config is valid
  END IF;

  -- Check sequential tier order
  FOR tier_item IN
    SELECT * FROM jsonb_array_elements(p_tiered_config)
    ORDER BY (value->>'tier_order')::int
  LOOP
    tier_order_val := (tier_item->>'tier_order')::int;
    IF tier_order_val != expected_order THEN
      RAISE EXCEPTION 'Tier order must be sequential starting from 1. Expected %, got %', expected_order, tier_order_val;
    END IF;
    expected_order := expected_order + 1;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: Triggers
-- =====================================================

-- Trigger: Auto-calculate volume from dimensions
CREATE OR REPLACE FUNCTION auto_calculate_vehicle_volume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.capacity_m3 IS NULL THEN
    NEW.capacity_m3 := calculate_cargo_volume(NEW.length_cm, NEW.width_cm, NEW.height_cm);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_vehicle_volume ON vehicles;
CREATE TRIGGER trigger_auto_calculate_vehicle_volume
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_vehicle_volume();

-- Trigger: Auto-sync vehicle_tiers from tiered_config
CREATE OR REPLACE FUNCTION auto_sync_vehicle_tiers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.tiered_config IS NOT NULL
     OR (TG_OP = 'UPDATE' AND (OLD.tiered_config IS DISTINCT FROM NEW.tiered_config))
  THEN
    PERFORM sync_vehicle_tiers_from_config(NEW.id, NEW.tiered_config);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_vehicle_tiers ON vehicles;
CREATE TRIGGER trigger_auto_sync_vehicle_tiers
  AFTER INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_vehicle_tiers();

-- =====================================================
-- STEP 7: RLS Policies for vehicle_tiers
-- =====================================================

ALTER TABLE vehicle_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to vehicle_tiers for authenticated users" ON vehicle_tiers;
CREATE POLICY "Allow read access to vehicle_tiers for authenticated users"
  ON vehicle_tiers FOR SELECT TO authenticated USING (true);

-- =====================================================
-- STEP 8: Helper View (vehicles with taxonomy)
-- =====================================================

CREATE OR REPLACE VIEW vehicles_with_taxonomy AS
SELECT
  v.*,
  vc.code AS category_code,
  vc.name AS category_name,
  vc.display_name AS category_display_name,
  vc.source AS category_source,
  vt.name AS type_name,
  vt.code AS type_code,
  vt.default_capacity_kg AS type_default_capacity_kg,
  vt.default_capacity_m3 AS type_default_capacity_m3
FROM vehicles v
LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id;

-- =====================================================
-- STEP 9: Helper View (vehicles with tier stats)
-- =====================================================

CREATE OR REPLACE VIEW vehicles_with_tier_stats AS
SELECT
  v.*,
  COUNT(vt.id) AS tier_count,
  COALESCE(SUM(vt.max_weight_kg), 0) AS total_tier_weight_kg,
  COALESCE(SUM(vt.max_volume_m3), 0) AS total_tier_volume_m3
FROM vehicles v
LEFT JOIN vehicle_tiers vt ON v.id = vt.vehicle_id
GROUP BY v.id;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN ('category_id', 'vehicle_type_id', 'capacity_m3', 'capacity_kg', 'length_cm', 'width_cm', 'height_cm', 'tiered_config')
ORDER BY column_name;

-- Check vehicle_types are now linked to categories
SELECT vt.name, vc.display_name AS category
FROM vehicle_types vt
LEFT JOIN vehicle_categories vc ON vt.category_id = vc.id
ORDER BY vt.name;

-- Check vehicle_tiers table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vehicle_tiers'
) AS vehicle_tiers_exists;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_cargo_volume', 'sync_vehicle_tiers_from_config', 'validate_tier_config')
ORDER BY routine_name;

-- Success message
SELECT '✅ Migration completed successfully! The vehicles table is now ready for the onboarding wizard.' AS status;

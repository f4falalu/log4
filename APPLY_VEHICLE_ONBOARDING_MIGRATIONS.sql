-- =====================================================
-- MANUAL MIGRATION: Vehicle Onboarding System
-- =====================================================
-- ⚠️  IMPORTANT NOTE:
-- This migration file references 'vlms_vehicles' table.
-- If you have an existing 'vehicles' table (not 'vlms_vehicles'),
-- use FIX_VEHICLES_TABLE_FOR_ONBOARDING.sql instead.
-- =====================================================
-- Run this SQL directly in Supabase SQL Editor
-- This applies only the vehicle onboarding migrations
-- independently of other pending migrations
-- =====================================================

-- =====================================================
-- STEP 0: Create base vlms_vehicles table (if not exists)
-- =====================================================
-- This ensures the vlms_vehicles table exists before we alter it
-- If you already have this table, this step will be skipped

CREATE TABLE IF NOT EXISTS vlms_vehicles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id VARCHAR(50) UNIQUE NOT NULL,

  -- Basic Info
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  vin VARCHAR(17) UNIQUE,
  license_plate VARCHAR(20) UNIQUE NOT NULL,

  -- Classification
  vehicle_type VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  transmission VARCHAR(50),

  -- Specifications
  engine_capacity DECIMAL(10, 2),
  color VARCHAR(50),
  seating_capacity INTEGER,
  cargo_capacity DECIMAL(10, 2),

  -- Acquisition
  acquisition_date DATE NOT NULL,
  acquisition_type VARCHAR(50) NOT NULL,
  purchase_price DECIMAL(15, 2),
  vendor_name VARCHAR(255),
  warranty_expiry DATE,

  -- Current Status
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  current_location_id UUID,
  current_driver_id UUID,
  current_assignment_type VARCHAR(50),

  -- Operational Metrics
  current_mileage DECIMAL(10, 2) DEFAULT 0,
  last_service_date DATE,
  next_service_date DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,

  -- Insurance & Registration
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  registration_expiry DATE,

  -- Financial
  depreciation_rate DECIMAL(5, 2),
  current_book_value DECIMAL(15, 2),
  total_maintenance_cost DECIMAL(15, 2) DEFAULT 0,

  -- Documents & Photos
  documents JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Indexes for vlms_vehicles (create only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_status ON vlms_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_type ON vlms_vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_location ON vlms_vehicles(current_location_id);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_driver ON vlms_vehicles(current_driver_id);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_license ON vlms_vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_next_service ON vlms_vehicles(next_service_date) WHERE status != 'disposed';
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_tags ON vlms_vehicles USING gin(tags);

-- =====================================================
-- STEP 1: Create vehicle_categories table
-- =====================================================

CREATE TABLE IF NOT EXISTS vehicle_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'eu', -- 'eu' | 'biko'
  default_tier_config JSONB DEFAULT '[]',
  description TEXT,
  icon_name TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_categories_code
  ON vehicle_categories(code);

CREATE INDEX IF NOT EXISTS idx_vehicle_categories_source
  ON vehicle_categories(source);

-- Seed EU Categories
INSERT INTO vehicle_categories (code, name, display_name, source, description, icon_name, default_tier_config)
VALUES
  ('L1', 'L1 - Light Two-Wheeler', 'L1 - Light Motorcycle/Moped', 'eu', 'Light two-wheel vehicles with max speed 45 km/h and engine ≤50cc', 'Bike', '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('L2', 'L2 - Three-Wheeler Moped', 'L2 - Tricycle/Keke', 'eu', 'Three-wheel mopeds with max speed 45 km/h', 'TramFront', '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('M1', 'M1 - Passenger Car', 'M1 - Car/Sedan', 'eu', 'Vehicles with ≤8 passenger seats (excluding driver)', 'Car', '[{"tier_name":"Boot","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('M2', 'M2 - Minibus', 'M2 - Minibus/Van', 'eu', 'Passenger vehicles with >8 seats and mass ≤5 tonnes', 'Bus', '[{"tier_name":"Rear Cargo","tier_order":1,"weight_pct":60,"volume_pct":60},{"tier_name":"Roof Rack","tier_order":2,"weight_pct":40,"volume_pct":40}]'),
  ('N1', 'N1 - Light Commercial Vehicle', 'N1 - Van/Light Truck', 'eu', 'Goods vehicles with mass ≤3.5 tonnes', 'Truck', '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('N2', 'N2 - Medium Commercial Vehicle', 'N2 - Medium Truck', 'eu', 'Goods vehicles with mass 3.5-12 tonnes', 'Truck', '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('N3', 'N3 - Heavy Commercial Vehicle', 'N3 - Heavy Truck', 'eu', 'Goods vehicles with mass >12 tonnes', 'Container', '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]')
ON CONFLICT (code) DO NOTHING;

-- Seed BIKO Categories
INSERT INTO vehicle_categories (code, name, display_name, source, description, icon_name, default_tier_config)
VALUES
  ('BIKO_MINIVAN', 'BIKO - Mini Van', 'Mini Van', 'biko', 'Small cargo van popular in urban delivery (e.g., Toyota Hiace)', 'Bus', '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'),
  ('BIKO_KEKE', 'BIKO - Keke/Tricycle', 'Keke', 'biko', 'Three-wheel motorized delivery vehicle (Keke NAPEP, Marwa)', 'TramFront', '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('BIKO_MOPED', 'BIKO - Delivery Moped', 'Delivery Moped', 'biko', 'Two-wheel motorcycle with rear cargo box', 'Bike', '[{"tier_name":"Top Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'),
  ('BIKO_COLDCHAIN', 'BIKO - Cold Chain Van', 'Cold Chain Van', 'biko', 'Refrigerated van for temperature-controlled delivery', 'Snowflake', '[{"tier_name":"Cold Storage","tier_order":1,"weight_pct":100,"volume_pct":100}]')
ON CONFLICT (code) DO NOTHING;

-- RLS Policies for vehicle_categories
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_categories'
    AND policyname = 'Allow read access to vehicle_categories for authenticated users'
  ) THEN
    CREATE POLICY "Allow read access to vehicle_categories for authenticated users"
      ON vehicle_categories FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create vehicle_types table
-- =====================================================

CREATE TABLE IF NOT EXISTS vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES vehicle_categories(id) ON DELETE SET NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  default_capacity_kg NUMERIC,
  default_capacity_m3 NUMERIC,
  default_tier_config JSONB DEFAULT '[]',
  icon_name TEXT,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_category ON vehicle_types(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_types_code ON vehicle_types(code) WHERE code IS NOT NULL;

-- Seed Vehicle Types
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'L1'),
  'MOPED_DELIVERY', 'Delivery Moped', 'Two-wheel motorcycle with top box for small parcels', 30, 0.25,
  '[{"tier_name":"Top Box","tier_order":1,"max_weight_kg":30,"max_volume_m3":0.25}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'MOPED_DELIVERY');

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'L2'),
  'KEKE_CARGO', 'Keke Cargo', 'Three-wheel delivery tricycle (Keke NAPEP)', 250, 0.5,
  '[{"tier_name":"Cargo Box","tier_order":1,"max_weight_kg":250,"max_volume_m3":0.5}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'KEKE_CARGO');

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'MINIVAN_HIACE', 'Mini Van (Toyota Hiace)', 'Popular minivan for urban delivery', 1000, 4.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":300,"max_volume_m3":1.35},{"tier_name":"Middle","tier_order":2,"max_weight_kg":400,"max_volume_m3":1.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":300,"max_volume_m3":1.35}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'MINIVAN_HIACE');

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'VAN_HIGH_ROOF', 'Van - High Roof', 'High-roof cargo van with maximum vertical space', 1200, 6.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":360,"max_volume_m3":1.8},{"tier_name":"Middle","tier_order":2,"max_weight_kg":480,"max_volume_m3":2.4},{"tier_name":"Upper","tier_order":3,"max_weight_kg":360,"max_volume_m3":1.8}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'VAN_HIGH_ROOF');

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'BIKO_COLDCHAIN'),
  'COLD_VAN', 'Cold Chain Van', 'Refrigerated van for temperature-sensitive goods', 800, 3.5,
  '[{"tier_name":"Cold Storage","tier_order":1,"max_weight_kg":800,"max_volume_m3":3.5}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'COLD_VAN');

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N2'),
  'TRUCK_3T', '3-Ton Truck', 'Medium box truck for bulk deliveries', 3000, 12.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":900,"max_volume_m3":3.6},{"tier_name":"Middle","tier_order":2,"max_weight_kg":1200,"max_volume_m3":4.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":900,"max_volume_m3":3.6}]'
WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE code = 'TRUCK_3T');

-- RLS Policies for vehicle_types
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_types'
    AND policyname = 'Allow read access to vehicle_types for authenticated users'
  ) THEN
    CREATE POLICY "Allow read access to vehicle_types for authenticated users"
      ON vehicle_types FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_types'
    AND policyname = 'Allow insert on vehicle_types for authenticated users'
  ) THEN
    CREATE POLICY "Allow insert on vehicle_types for authenticated users"
      ON vehicle_types FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- STEP 3: Alter vlms_vehicles table
-- =====================================================

-- Add new columns (all nullable for backward compatibility)
DO $$
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN category_id uuid;
  END IF;

  -- Add vehicle_type_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'vehicle_type_id'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN vehicle_type_id uuid;
  END IF;

  -- Add capacity_m3 column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'capacity_m3'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN capacity_m3 NUMERIC;
  END IF;

  -- Add capacity_kg column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'capacity_kg'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN capacity_kg NUMERIC;
  END IF;

  -- Add length_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'length_cm'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN length_cm INT;
  END IF;

  -- Add width_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'width_cm'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN width_cm INT;
  END IF;

  -- Add height_cm column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN height_cm INT;
  END IF;

  -- Add tiered_config column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vlms_vehicles' AND column_name = 'tiered_config'
  ) THEN
    ALTER TABLE vlms_vehicles ADD COLUMN tiered_config JSONB;
  END IF;
END $$;

-- Add foreign key constraints separately (after columns exist)
DO $$
BEGIN
  -- Add foreign key for category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vlms_vehicles_category_id_fkey'
  ) THEN
    ALTER TABLE vlms_vehicles
      ADD CONSTRAINT vlms_vehicles_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES vehicle_categories(id);
  END IF;

  -- Add foreign key for vehicle_type_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vlms_vehicles_vehicle_type_id_fkey'
  ) THEN
    ALTER TABLE vlms_vehicles
      ADD CONSTRAINT vlms_vehicles_vehicle_type_id_fkey
      FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_category ON vlms_vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_vehicle_type ON vlms_vehicles(vehicle_type_id);

-- Helper function: Calculate volume from dimensions
CREATE OR REPLACE FUNCTION calculate_cargo_volume(length_cm INT, width_cm INT, height_cm INT)
RETURNS NUMERIC AS $$
BEGIN
  IF length_cm IS NULL OR width_cm IS NULL OR height_cm IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((length_cm::NUMERIC / 100.0) * (width_cm::NUMERIC / 100.0) * (height_cm::NUMERIC / 100.0), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Auto-calculate capacity_m3 from dimensions
CREATE OR REPLACE FUNCTION auto_calculate_vehicle_volume()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.capacity_m3 IS NULL THEN
    NEW.capacity_m3 := calculate_cargo_volume(NEW.length_cm, NEW.width_cm, NEW.height_cm);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_calculate_vehicle_volume ON vlms_vehicles;
CREATE TRIGGER trigger_auto_calculate_vehicle_volume
  BEFORE INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_vehicle_volume();

-- Helper view: Vehicles with category & type details
CREATE OR REPLACE VIEW vlms_vehicles_with_taxonomy AS
SELECT
  v.*,
  vc.code as category_code,
  vc.display_name as category_name,
  vc.source as category_source,
  vt.code as type_code,
  vt.name as type_name,
  vt.description as type_description
FROM vlms_vehicles v
LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id;

-- =====================================================
-- STEP 4: Create vehicle_tiers table
-- =====================================================

CREATE TABLE IF NOT EXISTS vehicle_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vlms_vehicles(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_order INT NOT NULL,
  max_weight_kg NUMERIC,
  max_volume_m3 NUMERIC,
  description TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle ON vehicle_tiers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle_order ON vehicle_tiers(vehicle_id, tier_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_tiers_vehicle_name_unique ON vehicle_tiers(vehicle_id, tier_name);

-- Function: Sync tiers from JSONB config
CREATE OR REPLACE FUNCTION sync_vehicle_tiers_from_config(p_vehicle_id uuid, p_tier_config JSONB)
RETURNS void AS $$
DECLARE
  tier JSONB;
BEGIN
  DELETE FROM vehicle_tiers WHERE vehicle_id = p_vehicle_id;

  IF p_tier_config IS NULL OR jsonb_array_length(p_tier_config) = 0 THEN
    RETURN;
  END IF;

  FOR tier IN SELECT * FROM jsonb_array_elements(p_tier_config)
  LOOP
    INSERT INTO vehicle_tiers (vehicle_id, tier_name, tier_order, max_weight_kg, max_volume_m3)
    VALUES (
      p_vehicle_id,
      tier->>'tier_name',
      (tier->>'tier_order')::INT,
      (tier->>'max_weight_kg')::NUMERIC,
      (tier->>'max_volume_m3')::NUMERIC
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-sync tiers when tiered_config changes
CREATE OR REPLACE FUNCTION auto_sync_vehicle_tiers()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.tiered_config IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND (OLD.tiered_config IS DISTINCT FROM NEW.tiered_config))
  THEN
    PERFORM sync_vehicle_tiers_from_config(NEW.id, NEW.tiered_config);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_vehicle_tiers ON vlms_vehicles;
CREATE TRIGGER trigger_auto_sync_vehicle_tiers
  AFTER INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_vehicle_tiers();

-- RLS Policies for vehicle_tiers
ALTER TABLE vehicle_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicle_tiers'
    AND policyname = 'Allow read access to vehicle_tiers for authenticated users'
  ) THEN
    CREATE POLICY "Allow read access to vehicle_tiers for authenticated users"
      ON vehicle_tiers FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check seeded categories
SELECT COUNT(*) as category_count FROM vehicle_categories;

-- Check seeded types
SELECT COUNT(*) as type_count FROM vehicle_types;

-- Check new columns on vlms_vehicles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vlms_vehicles'
  AND column_name IN ('category_id', 'vehicle_type_id', 'capacity_m3', 'capacity_kg', 'tiered_config')
ORDER BY column_name;

-- =====================================================
-- COMPLETE!
-- =====================================================
-- Expected results:
-- - 11 categories (7 EU + 4 BIKO)
-- - 6+ vehicle types
-- - New columns added to vlms_vehicles
-- - Auto-triggers active
-- =====================================================

-- =====================================================
-- VLMS VEHICLE ONBOARDING - PHASE 1
-- Migration: Create vehicle_categories table
-- Purpose: Standards-compliant vehicle classification (EU + BIKO)
-- =====================================================

-- Create vehicle_categories table
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'eu', -- 'eu' | 'biko'
  default_tier_config JSONB DEFAULT '[]',
  description TEXT,
  icon_name TEXT, -- Lucide icon name for UI
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_categories_code
  ON vehicle_categories(code);

CREATE INDEX IF NOT EXISTS idx_vehicle_categories_source
  ON vehicle_categories(source);

-- Add comments for documentation
COMMENT ON TABLE vehicle_categories IS 'Standards-compliant vehicle classification system (EU categories + BIKO shortcuts)';
COMMENT ON COLUMN vehicle_categories.code IS 'Unique category code (e.g., N1, M2, BIKO_MINIVAN)';
COMMENT ON COLUMN vehicle_categories.source IS 'Category source: eu (European standard) or biko (custom)';
COMMENT ON COLUMN vehicle_categories.default_tier_config IS 'Default tier configuration JSON for vehicles in this category';

-- =====================================================
-- SEED DATA: EU VEHICLE CATEGORIES (Subset)
-- =====================================================

INSERT INTO vehicle_categories (code, name, display_name, source, description, icon_name, default_tier_config)
VALUES
  -- L Category: Two/Three-wheelers
  (
    'L1',
    'L1 - Light Two-Wheeler',
    'L1 - Light Motorcycle/Moped',
    'eu',
    'Light two-wheel vehicles with max speed 45 km/h and engine ≤50cc',
    'Bike',
    '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  ),
  (
    'L2',
    'L2 - Three-Wheeler Moped',
    'L2 - Tricycle/Keke',
    'eu',
    'Three-wheel mopeds with max speed 45 km/h',
    'TramFront',
    '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  ),

  -- M Category: Passenger Vehicles
  (
    'M1',
    'M1 - Passenger Car',
    'M1 - Car/Sedan',
    'eu',
    'Vehicles with ≤8 passenger seats (excluding driver)',
    'Car',
    '[{"tier_name":"Boot","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  ),
  (
    'M2',
    'M2 - Minibus',
    'M2 - Minibus/Van',
    'eu',
    'Passenger vehicles with >8 seats and mass ≤5 tonnes',
    'Bus',
    '[{"tier_name":"Rear Cargo","tier_order":1,"weight_pct":60,"volume_pct":60},{"tier_name":"Roof Rack","tier_order":2,"weight_pct":40,"volume_pct":40}]'
  ),

  -- N Category: Goods Vehicles
  (
    'N1',
    'N1 - Light Commercial Vehicle',
    'N1 - Van/Light Truck',
    'eu',
    'Goods vehicles with mass ≤3.5 tonnes',
    'Truck',
    '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'
  ),
  (
    'N2',
    'N2 - Medium Commercial Vehicle',
    'N2 - Medium Truck',
    'eu',
    'Goods vehicles with mass 3.5-12 tonnes',
    'Truck',
    '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'
  ),
  (
    'N3',
    'N3 - Heavy Commercial Vehicle',
    'N3 - Heavy Truck',
    'eu',
    'Goods vehicles with mass >12 tonnes',
    'Container',
    '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'
  )

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SEED DATA: BIKO CUSTOM CATEGORIES
-- =====================================================

INSERT INTO vehicle_categories (code, name, display_name, source, description, icon_name, default_tier_config)
VALUES
  -- BIKO shortcuts for common local vehicle types
  (
    'BIKO_MINIVAN',
    'BIKO - Mini Van',
    'Mini Van',
    'biko',
    'Small cargo van popular in urban delivery (e.g., Toyota Hiace)',
    'Bus',
    '[{"tier_name":"Lower","tier_order":1,"weight_pct":30,"volume_pct":30},{"tier_name":"Middle","tier_order":2,"weight_pct":40,"volume_pct":40},{"tier_name":"Upper","tier_order":3,"weight_pct":30,"volume_pct":30}]'
  ),
  (
    'BIKO_KEKE',
    'BIKO - Keke/Tricycle',
    'Keke',
    'biko',
    'Three-wheel motorized delivery vehicle (Keke NAPEP, Marwa)',
    'TramFront',
    '[{"tier_name":"Cargo Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  ),
  (
    'BIKO_MOPED',
    'BIKO - Delivery Moped',
    'Delivery Moped',
    'biko',
    'Two-wheel motorcycle with rear cargo box',
    'Bike',
    '[{"tier_name":"Top Box","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  ),
  (
    'BIKO_COLDCHAIN',
    'BIKO - Cold Chain Van',
    'Cold Chain Van',
    'biko',
    'Refrigerated van for temperature-controlled delivery',
    'Snowflake',
    '[{"tier_name":"Cold Storage","tier_order":1,"weight_pct":100,"volume_pct":100}]'
  )

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Allow read access to vehicle_categories for authenticated users"
  ON vehicle_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow admins to insert/update/delete categories
CREATE POLICY "Allow admin insert on vehicle_categories"
  ON vehicle_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admin update on vehicle_categories"
  ON vehicle_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admin delete on vehicle_categories"
  ON vehicle_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_vehicle_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_categories_updated_at
  BEFORE UPDATE ON vehicle_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_categories_updated_at();

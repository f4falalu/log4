-- =====================================================
-- VLMS VEHICLE ONBOARDING - PHASE 1
-- Migration: Create vehicle_types table
-- Purpose: Operational vehicle subtypes mapped to categories
-- =====================================================

-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES vehicle_categories(id) ON DELETE SET NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  default_capacity_kg NUMERIC,
  default_capacity_m3 NUMERIC,
  default_tier_config JSONB DEFAULT '[]',
  icon_name TEXT, -- Lucide icon override (inherits from category if null)
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_types_category
  ON vehicle_types(category_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_code
  ON vehicle_types(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_types_created_by
  ON vehicle_types(created_by);

-- Add comments for documentation
COMMENT ON TABLE vehicle_types IS 'Operational vehicle subtypes mapped to standards-compliant categories';
COMMENT ON COLUMN vehicle_types.category_id IS 'Reference to parent vehicle category (EU or BIKO)';
COMMENT ON COLUMN vehicle_types.code IS 'Optional code for programmatic reference (e.g., KEKE_CARGO)';
COMMENT ON COLUMN vehicle_types.default_capacity_kg IS 'Suggested maximum payload capacity in kilograms';
COMMENT ON COLUMN vehicle_types.default_capacity_m3 IS 'Suggested cargo volume in cubic meters';
COMMENT ON COLUMN vehicle_types.default_tier_config IS 'Default tier configuration for vehicles of this type';

-- =====================================================
-- SEED DATA: OPERATIONAL VEHICLE TYPES
-- =====================================================

-- L1/L2 Category: Delivery Mopeds & Tricycles
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'L1'),
  'MOPED_DELIVERY',
  'Delivery Moped',
  'Two-wheel motorcycle with top box for small parcels',
  30,
  0.25,
  '[{"tier_name":"Top Box","tier_order":1,"max_weight_kg":30,"max_volume_m3":0.25}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'L2'),
  'KEKE_CARGO',
  'Keke Cargo',
  'Three-wheel delivery tricycle (Keke NAPEP)',
  250,
  0.5,
  '[{"tier_name":"Cargo Box","tier_order":1,"max_weight_kg":250,"max_volume_m3":0.5}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'BIKO_KEKE'),
  'KEKE_PASSENGER_CONVERTED',
  'Keke (Passenger Converted)',
  'Passenger tricycle converted for cargo delivery',
  200,
  0.4,
  '[{"tier_name":"Rear Cargo","tier_order":1,"max_weight_kg":200,"max_volume_m3":0.4}]'
ON CONFLICT DO NOTHING;

-- M1 Category: Passenger Cars (with boot space)
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'M1'),
  'SEDAN_STANDARD',
  'Standard Sedan',
  'Passenger car with boot space for small deliveries',
  150,
  0.4,
  '[{"tier_name":"Boot","tier_order":1,"max_weight_kg":150,"max_volume_m3":0.4}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'M1'),
  'HATCHBACK',
  'Hatchback',
  'Compact car with foldable rear seats',
  200,
  0.6,
  '[{"tier_name":"Trunk","tier_order":1,"max_weight_kg":200,"max_volume_m3":0.6}]'
ON CONFLICT DO NOTHING;

-- N1 Category: Vans & Light Commercial Vehicles
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'MINIVAN_HIACE',
  'Mini Van (Toyota Hiace)',
  'Popular minivan for urban delivery',
  1000,
  4.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":300,"max_volume_m3":1.35},{"tier_name":"Middle","tier_order":2,"max_weight_kg":400,"max_volume_m3":1.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":300,"max_volume_m3":1.35}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'BIKO_MINIVAN'),
  'MINIVAN_HIACE_ALT',
  'Mini Van',
  'Standard minivan for cargo delivery',
  1000,
  4.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":300,"max_volume_m3":1.35},{"tier_name":"Middle","tier_order":2,"max_weight_kg":400,"max_volume_m3":1.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":300,"max_volume_m3":1.35}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'VAN_HIGH_ROOF',
  'Van - High Roof',
  'High-roof cargo van with maximum vertical space',
  1200,
  6.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":360,"max_volume_m3":1.8},{"tier_name":"Middle","tier_order":2,"max_weight_kg":480,"max_volume_m3":2.4},{"tier_name":"Upper","tier_order":3,"max_weight_kg":360,"max_volume_m3":1.8}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N1'),
  'VAN_PANEL',
  'Panel Van',
  'Enclosed panel van for secure cargo transport',
  900,
  3.5,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":270,"max_volume_m3":1.05},{"tier_name":"Middle","tier_order":2,"max_weight_kg":360,"max_volume_m3":1.4},{"tier_name":"Upper","tier_order":3,"max_weight_kg":270,"max_volume_m3":1.05}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'BIKO_COLDCHAIN'),
  'COLD_VAN',
  'Cold Chain Van',
  'Refrigerated van for temperature-sensitive goods',
  800,
  3.5,
  '[{"tier_name":"Cold Storage","tier_order":1,"max_weight_kg":800,"max_volume_m3":3.5}]'
ON CONFLICT DO NOTHING;

-- N2 Category: Medium Trucks
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N2'),
  'TRUCK_3T',
  '3-Ton Truck',
  'Medium box truck for bulk deliveries',
  3000,
  12.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":900,"max_volume_m3":3.6},{"tier_name":"Middle","tier_order":2,"max_weight_kg":1200,"max_volume_m3":4.8},{"tier_name":"Upper","tier_order":3,"max_weight_kg":900,"max_volume_m3":3.6}]'
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N2'),
  'TRUCK_5T',
  '5-Ton Truck',
  'Medium truck for regional distribution',
  5000,
  18.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":1500,"max_volume_m3":5.4},{"tier_name":"Middle","tier_order":2,"max_weight_kg":2000,"max_volume_m3":7.2},{"tier_name":"Upper","tier_order":3,"max_weight_kg":1500,"max_volume_m3":5.4}]'
ON CONFLICT DO NOTHING;

-- N3 Category: Heavy Trucks
INSERT INTO vehicle_types (category_id, code, name, description, default_capacity_kg, default_capacity_m3, default_tier_config)
SELECT
  (SELECT id FROM vehicle_categories WHERE code = 'N3'),
  'TRUCK_10T',
  '10-Ton Truck',
  'Heavy truck for long-haul deliveries',
  10000,
  30.0,
  '[{"tier_name":"Lower","tier_order":1,"max_weight_kg":3000,"max_volume_m3":9.0},{"tier_name":"Middle","tier_order":2,"max_weight_kg":4000,"max_volume_m3":12.0},{"tier_name":"Upper","tier_order":3,"max_weight_kg":3000,"max_volume_m3":9.0}]'
ON CONFLICT DO NOTHING;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read vehicle types
CREATE POLICY "Allow read access to vehicle_types for authenticated users"
  ON vehicle_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create custom vehicle types
CREATE POLICY "Allow insert on vehicle_types for authenticated users"
  ON vehicle_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow creators and admins to update vehicle types
CREATE POLICY "Allow update on vehicle_types for creators and admins"
  ON vehicle_types
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Allow creators and admins to delete vehicle types
CREATE POLICY "Allow delete on vehicle_types for creators and admins"
  ON vehicle_types
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_vehicle_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();

-- =====================================================
-- VLMS VEHICLE ONBOARDING - PHASE 1
-- Migration: Alter vlms_vehicles table (additive, non-breaking)
-- Purpose: Add new taxonomy and capacity fields
-- =====================================================

-- Add new columns to existing vlms_vehicles table
-- All columns are NULLABLE to maintain backward compatibility

ALTER TABLE vlms_vehicles
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES vehicle_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES vehicle_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity_m3 NUMERIC,
  ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS length_cm INT,
  ADD COLUMN IF NOT EXISTS width_cm INT,
  ADD COLUMN IF NOT EXISTS height_cm INT,
  ADD COLUMN IF NOT EXISTS tiered_config JSONB DEFAULT '[]';

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_category
  ON vlms_vehicles(category_id);

CREATE INDEX IF NOT EXISTS idx_vlms_vehicles_vehicle_type
  ON vlms_vehicles(vehicle_type_id);

-- Add comments for documentation
COMMENT ON COLUMN vlms_vehicles.category_id IS 'Reference to vehicle category (EU or BIKO classification)';
COMMENT ON COLUMN vlms_vehicles.vehicle_type_id IS 'Reference to operational vehicle subtype';
COMMENT ON COLUMN vlms_vehicles.capacity_m3 IS 'Cargo capacity in cubic meters (calculated or provided)';
COMMENT ON COLUMN vlms_vehicles.capacity_kg IS 'Maximum payload capacity in kilograms';
COMMENT ON COLUMN vlms_vehicles.length_cm IS 'Cargo area inner length in centimeters';
COMMENT ON COLUMN vlms_vehicles.width_cm IS 'Cargo area inner width in centimeters';
COMMENT ON COLUMN vlms_vehicles.height_cm IS 'Cargo area inner height in centimeters';
COMMENT ON COLUMN vlms_vehicles.tiered_config IS 'Tier-based capacity configuration JSON array';

-- =====================================================
-- HELPER VIEW: Vehicles with Category & Type Details
-- =====================================================

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

COMMENT ON VIEW vlms_vehicles_with_taxonomy IS 'Vehicles joined with category and type details for easy querying';

-- Grant access to view
GRANT SELECT ON vlms_vehicles_with_taxonomy TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Calculate Volume from Dimensions
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_cargo_volume(
  length_cm INT,
  width_cm INT,
  height_cm INT
)
RETURNS NUMERIC AS $$
BEGIN
  -- Return null if any dimension is null
  IF length_cm IS NULL OR width_cm IS NULL OR height_cm IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate volume: (L/100 * W/100 * H/100) = m³
  -- Round to 2 decimal places
  RETURN ROUND(
    (length_cm::NUMERIC / 100.0) *
    (width_cm::NUMERIC / 100.0) *
    (height_cm::NUMERIC / 100.0),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_cargo_volume IS 'Calculate cargo volume in m³ from dimensions in cm';

-- =====================================================
-- TRIGGER: Auto-calculate capacity_m3 from dimensions
-- =====================================================

CREATE OR REPLACE FUNCTION auto_calculate_vehicle_volume()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-calculate if dimensions are provided but capacity_m3 is not
  IF NEW.length_cm IS NOT NULL
     AND NEW.width_cm IS NOT NULL
     AND NEW.height_cm IS NOT NULL
     AND NEW.capacity_m3 IS NULL
  THEN
    NEW.capacity_m3 := calculate_cargo_volume(
      NEW.length_cm,
      NEW.width_cm,
      NEW.height_cm
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_vehicle_volume
  BEFORE INSERT OR UPDATE ON vlms_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_vehicle_volume();

COMMENT ON TRIGGER trigger_auto_calculate_vehicle_volume ON vlms_vehicles IS 'Auto-calculate capacity_m3 from dimensions if not explicitly provided';

-- =====================================================
-- VALIDATION FUNCTION: Validate Tier Configuration
-- =====================================================

CREATE OR REPLACE FUNCTION validate_tier_config(
  tier_config JSONB,
  max_capacity_kg NUMERIC
)
RETURNS TABLE(
  is_valid BOOLEAN,
  total_weight_kg NUMERIC,
  validation_message TEXT
) AS $$
DECLARE
  total_weight NUMERIC := 0;
  tier JSONB;
BEGIN
  -- If tier_config is empty or null, it's valid
  IF tier_config IS NULL OR jsonb_array_length(tier_config) = 0 THEN
    RETURN QUERY SELECT true, 0::NUMERIC, 'No tier configuration provided'::TEXT;
    RETURN;
  END IF;

  -- Sum up all tier weights
  FOR tier IN SELECT * FROM jsonb_array_elements(tier_config)
  LOOP
    total_weight := total_weight + COALESCE((tier->>'max_weight_kg')::NUMERIC, 0);
  END LOOP;

  -- Validate total doesn't exceed capacity (with 5% tolerance)
  IF max_capacity_kg IS NOT NULL AND total_weight > (max_capacity_kg * 1.05) THEN
    RETURN QUERY SELECT
      false,
      total_weight,
      format('Tier weights (%s kg) exceed vehicle capacity (%s kg)', total_weight, max_capacity_kg);
  ELSE
    RETURN QUERY SELECT
      true,
      total_weight,
      'Tier configuration is valid'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_tier_config IS 'Validate that tier configuration does not exceed vehicle capacity';

-- =====================================================
-- VLMS VEHICLE CONFIGURATOR - ADDITIONAL FIELDS
-- Migration: Add missing fields for vehicle configurator
-- Purpose: Add interior dimensions, variant, axles, wheels, gross weight
-- =====================================================

-- Add new columns for vehicle configurator
ALTER TABLE vlms_vehicles
  ADD COLUMN IF NOT EXISTS interior_length_cm INT,
  ADD COLUMN IF NOT EXISTS interior_width_cm INT,
  ADD COLUMN IF NOT EXISTS interior_height_cm INT,
  ADD COLUMN IF NOT EXISTS gross_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS axles INT,
  ADD COLUMN IF NOT EXISTS number_of_wheels INT,
  ADD COLUMN IF NOT EXISTS variant VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN vlms_vehicles.interior_length_cm IS 'Interior cabin length in centimeters';
COMMENT ON COLUMN vlms_vehicles.interior_width_cm IS 'Interior cabin width in centimeters';
COMMENT ON COLUMN vlms_vehicles.interior_height_cm IS 'Interior cabin height in centimeters';
COMMENT ON COLUMN vlms_vehicles.gross_weight_kg IS 'Gross Vehicle Weight Rating (GVWR) in kilograms';
COMMENT ON COLUMN vlms_vehicles.axles IS 'Number of axles';
COMMENT ON COLUMN vlms_vehicles.number_of_wheels IS 'Total number of wheels';
COMMENT ON COLUMN vlms_vehicles.variant IS 'Vehicle variant or trim level (e.g., LWB High Roof)';

-- Update the helper view to include new fields
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

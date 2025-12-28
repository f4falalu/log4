-- ============================================================================
-- Vehicle Consolidation Audit - Step 4: Create Unified View
-- ============================================================================
-- Purpose: Create a transition view for gradual migration
-- Allows code to switch between old and new table via feature flag
-- Non-blocking reads during migration period
-- ============================================================================

BEGIN;

-- Create the unified view that presents canonical vehicles data
CREATE OR REPLACE VIEW vehicles_unified_v AS
SELECT
  v.id,
  v.category_id,
  v.vehicle_type_id,
  v.fleet_id,

  -- Basic Info
  v.make,
  v.model,
  v.year,
  v.license_plate,
  v.plate_number,
  v.vin,

  -- Physical Dimensions
  v.length_cm,
  v.width_cm,
  v.height_cm,

  -- Capacity Fields
  v.capacity,           -- Legacy field (may be deprecated)
  v.capacity_kg,
  v.capacity_m3,
  v.capacity_weight_kg, -- Legacy field
  v.capacity_volume_m3, -- Legacy field
  v.max_weight,         -- Legacy field
  v.gross_vehicle_weight_kg,

  -- Configuration
  v.tiered_config,

  -- Telematics
  v.telematics_provider,
  v.telematics_id,

  -- Technical Specs
  v.number_of_axles,
  v.number_of_wheels,
  v.fuel_type,
  v.fuel_efficiency,
  v.avg_speed,
  v.engine_capacity,
  v.transmission,
  v.seating_capacity,

  -- Acquisition & Financials
  v.acquisition_mode,
  v.acquisition_type,
  v.acquisition_date,
  v.date_acquired,
  v.purchase_price,
  v.current_book_value,
  v.depreciation_rate,

  -- Insurance & Registration
  v.insurance_expiry,
  v.insurance_policy_number,
  v.insurance_provider,
  v.registration_expiry,

  -- Maintenance
  v.last_service_date,
  v.next_service_date,
  v.last_inspection_date,
  v.next_inspection_date,
  v.total_maintenance_cost,
  v.warranty_expiry,

  -- Current State
  v.status,
  v.current_driver_id,
  v.current_location_id,
  v.current_mileage,

  -- Metadata
  v.color,
  v.notes,
  v.tags,
  v.photos,
  v.photo_url,
  v.thumbnail_url,
  v.photo_uploaded_at,
  v.ai_capacity_image_url,
  v.ai_generated,
  v.documents,

  -- Legacy Metadata (for audit trail)
  v.legacy_metadata,

  -- Audit Fields
  v.created_at,
  v.created_by,
  v.updated_at,
  v.updated_by

FROM vehicles v;

-- Add comment for documentation
COMMENT ON VIEW vehicles_unified_v IS 'Unified vehicle view for consolidation migration. Use this during feature-flagged transition from vlms_vehicles to canonical vehicles table.';

-- Grant access to authenticated users (match existing vehicles table permissions)
GRANT SELECT ON vehicles_unified_v TO authenticated;

-- Create helper function to get vehicle details with relationships
CREATE OR REPLACE FUNCTION get_vehicle_with_details(vehicle_uuid uuid)
RETURNS TABLE (
  -- Vehicle fields
  id uuid,
  fleet_id uuid,
  category_id uuid,
  vehicle_type_id uuid,
  license_plate text,
  make text,
  model text,
  year int,
  capacity_kg numeric,
  capacity_m3 numeric,
  status text,

  -- Joined category info
  category_code text,
  category_name text,

  -- Joined type info
  type_code text,
  type_name text,

  -- Joined driver info
  driver_name text,
  driver_phone text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.fleet_id,
    v.category_id,
    v.vehicle_type_id,
    v.license_plate,
    v.make,
    v.model,
    v.year,
    v.capacity_kg,
    v.capacity_m3,
    v.status::text,

    vc.code as category_code,
    vc.display_name as category_name,

    vt.code as type_code,
    vt.name as type_name,

    p.full_name as driver_name,
    p.phone as driver_phone

  FROM vehicles_unified_v v
  LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
  LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
  LEFT JOIN drivers d ON v.current_driver_id = d.id
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE v.id = vehicle_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_vehicle_with_details IS 'Get vehicle details with category, type, and current driver information';

COMMIT;

-- ============================================================================
-- Rollback Script
-- ============================================================================
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_vehicle_with_details(uuid);
-- DROP VIEW IF EXISTS vehicles_unified_v;
-- COMMIT;

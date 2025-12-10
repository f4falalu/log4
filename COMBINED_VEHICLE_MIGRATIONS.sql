-- ============================================================================
-- COMBINED VEHICLE CONSOLIDATION MIGRATIONS
-- ============================================================================
-- Purpose: Apply all 4 vehicle consolidation migrations in one execution
-- Apply via Supabase Dashboard SQL Editor
-- URL: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new
-- ============================================================================

-- ============================================================================
-- Migration 1: Add Canonical Vehicle Columns
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
-- Migration 2: Create Vehicle Merge Audit Table
-- ============================================================================

BEGIN;

-- Create audit table for vehicle merge operations
CREATE TABLE IF NOT EXISTS vehicle_merge_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source identifiers
  vehicles_id uuid,
  vlms_id uuid,

  -- Merge tracking
  merged_at timestamptz DEFAULT now(),
  merged_by text DEFAULT current_user,

  -- Conflict tracking
  conflicts jsonb DEFAULT '{}'::jsonb,
  resolved_conflicts jsonb DEFAULT '{}'::jsonb,

  -- Status tracking
  status text CHECK (status IN ('success', 'conflict', 'skipped', 'pending', 'failed')),

  -- Notes and metadata
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_vehicles_id
  ON vehicle_merge_audit(vehicles_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_vlms_id
  ON vehicle_merge_audit(vlms_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_status
  ON vehicle_merge_audit(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_merged_at
  ON vehicle_merge_audit(merged_at DESC);

-- Add table comment
COMMENT ON TABLE vehicle_merge_audit IS 'Audit trail for vehicle data consolidation from vlms_vehicles to vehicles table';

COMMIT;

-- ============================================================================
-- Migration 3: Backfill Data from vlms_vehicles to vehicles
-- ============================================================================

BEGIN;

-- Phase 1: Insert new vehicles from vlms_vehicles not in vehicles
INSERT INTO vehicles (
  id,
  fleet_id,
  category_id,
  vehicle_type_id,
  type,
  make,
  model,
  year,
  license_plate,
  plate_number,
  vin,
  length_cm,
  width_cm,
  height_cm,
  capacity_kg,
  capacity_m3,
  capacity,
  avg_speed,
  fuel_efficiency,
  max_weight,
  acquisition_mode,
  date_acquired,
  insurance_expiry,
  insurance_policy_number,
  insurance_provider,
  registration_expiry,
  last_service_date,
  next_service_date,
  last_inspection_date,
  next_inspection_date,
  purchase_price,
  current_book_value,
  depreciation_rate,
  fuel_type,
  engine_capacity,
  transmission,
  seating_capacity,
  color,
  notes,
  tags,
  photos,
  documents,
  status,
  created_at,
  created_by,
  updated_at,
  updated_by,
  legacy_metadata
)
SELECT
  vl.id,
  NULL::uuid,  -- fleet_id - vlms_vehicles doesn't have this
  NULL::uuid,  -- category_id - vlms_vehicles doesn't have this
  NULL::uuid,  -- vehicle_type_id - vlms_vehicles doesn't have this (has vehicle_type as text)
  vl.vehicle_type,  -- type - required NOT NULL field
  vl.make,
  vl.model,
  vl.year,
  vl.license_plate,
  vl.license_plate,
  vl.vin,
  NULL::int,  -- length_cm - vlms_vehicles doesn't have this
  NULL::int,  -- width_cm - vlms_vehicles doesn't have this
  NULL::int,  -- height_cm - vlms_vehicles doesn't have this
  vl.cargo_capacity,  -- capacity_kg (vlms uses cargo_capacity)
  NULL::numeric,  -- capacity_m3 - vlms_vehicles doesn't have this
  COALESCE(vl.cargo_capacity, 0),  -- capacity - required NOT NULL, use cargo_capacity or 0
  0,  -- avg_speed - required NOT NULL, default 0
  0,  -- fuel_efficiency - required NOT NULL, default 0
  COALESCE(vl.cargo_capacity, 0),  -- max_weight - required NOT NULL, use cargo_capacity or 0
  vl.acquisition_type,
  vl.acquisition_date::date,
  vl.insurance_expiry::timestamptz,
  vl.insurance_policy_number,
  vl.insurance_provider,
  vl.registration_expiry::timestamptz,
  vl.last_service_date::date,
  vl.next_service_date::date,
  vl.last_inspection_date::date,
  vl.next_inspection_date::date,
  vl.purchase_price,
  vl.current_book_value,
  vl.depreciation_rate,
  -- Map fuel_type text to enum (handle variations like 'gasoline' -> 'petrol')
  CASE lower(trim(vl.fuel_type))
    WHEN 'diesel' THEN 'diesel'::fuel_type
    WHEN 'petrol' THEN 'petrol'::fuel_type
    WHEN 'gasoline' THEN 'petrol'::fuel_type
    WHEN 'electric' THEN 'electric'::fuel_type
    WHEN 'hybrid' THEN 'electric'::fuel_type
    ELSE 'diesel'::fuel_type  -- Default fallback
  END,
  vl.engine_capacity,
  vl.transmission,
  vl.seating_capacity,
  vl.color,
  vl.notes,
  vl.tags,
  vl.photos,
  vl.documents,
  -- Map status text to enum
  CASE lower(trim(vl.status))
    WHEN 'available' THEN 'available'::vehicle_status
    WHEN 'in-use' THEN 'in-use'::vehicle_status
    WHEN 'in use' THEN 'in-use'::vehicle_status
    WHEN 'maintenance' THEN 'maintenance'::vehicle_status
    WHEN 'active' THEN 'available'::vehicle_status
    ELSE 'available'::vehicle_status  -- Default fallback
  END,
  COALESCE(vl.created_at, now()),
  vl.created_by,
  COALESCE(vl.updated_at, now()),
  vl.updated_by,
  jsonb_build_object(
    'source', 'vlms_vehicles',
    'vlms_id', vl.id,
    'vehicle_type_text', vl.vehicle_type,
    'migrated_at', now(),
    'migration_version', '20251129000003'
  )
FROM vlms_vehicles vl
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles v
  WHERE v.license_plate = vl.license_plate
     OR v.plate_number = vl.license_plate
)
AND vl.license_plate IS NOT NULL
AND vl.license_plate != '';

-- Log insert operations
INSERT INTO vehicle_merge_audit (vehicles_id, vlms_id, status, notes, metadata)
SELECT
  v.id,
  vl.id,
  'success',
  'New vehicle inserted from vlms_vehicles',
  jsonb_build_object(
    'operation', 'insert',
    'license_plate', vl.license_plate,
    'make', vl.make,
    'model', vl.model
  )
FROM vehicles v
INNER JOIN vlms_vehicles vl ON v.license_plate = vl.license_plate
WHERE v.legacy_metadata->>'source' = 'vlms_vehicles'
  AND v.legacy_metadata->>'migration_version' = '20251129000003';

-- Phase 2: Update existing vehicles with merged data
UPDATE vehicles v
SET
  capacity_kg = GREATEST(COALESCE(v.capacity_kg, 0), COALESCE(vl.cargo_capacity, 0)),
  -- vlms_vehicles doesn't have: capacity_m3, width_cm, height_cm, length_cm, tiered_config, fleet_id, category_id, vehicle_type_id
  make = COALESCE(v.make, vl.make),
  model = COALESCE(v.model, vl.model),
  year = COALESCE(v.year, vl.year),
  vin = COALESCE(v.vin, vl.vin),
  acquisition_mode = COALESCE(vl.acquisition_type, v.acquisition_mode),
  date_acquired = COALESCE(vl.acquisition_date::date, v.date_acquired),
  insurance_expiry = COALESCE(vl.insurance_expiry::timestamptz, v.insurance_expiry),
  insurance_policy_number = COALESCE(vl.insurance_policy_number, v.insurance_policy_number),
  insurance_provider = COALESCE(vl.insurance_provider, v.insurance_provider),
  registration_expiry = COALESCE(vl.registration_expiry::timestamptz, v.registration_expiry),
  last_service_date = CASE
    WHEN vl.last_service_date IS NOT NULL AND v.last_service_date IS NOT NULL
      THEN GREATEST(vl.last_service_date::date, v.last_service_date)
    ELSE COALESCE(vl.last_service_date::date, v.last_service_date)
  END,
  color = COALESCE(v.color, vl.color),
  engine_capacity = COALESCE(v.engine_capacity, vl.engine_capacity),
  transmission = COALESCE(v.transmission, vl.transmission),
  seating_capacity = COALESCE(v.seating_capacity, vl.seating_capacity),
  notes = CASE
    WHEN v.notes IS NOT NULL AND vl.notes IS NOT NULL
      THEN v.notes || E'\n\n--- From VLMS ---\n' || vl.notes
    ELSE COALESCE(v.notes, vl.notes)
  END,
  tags = CASE
    WHEN v.tags IS NOT NULL AND vl.tags IS NOT NULL
      THEN array(SELECT DISTINCT unnest(v.tags || vl.tags))
    ELSE COALESCE(v.tags, vl.tags)
  END,
  updated_at = now(),
  legacy_metadata = COALESCE(v.legacy_metadata, '{}'::jsonb) || jsonb_build_object(
    'vlms_merged', true,
    'vlms_id', vl.id,
    'vehicle_type_text', vl.vehicle_type,
    'merged_at', now(),
    'migration_version', '20251129000003'
  )
FROM vlms_vehicles vl
WHERE (v.license_plate = vl.license_plate OR v.plate_number = vl.license_plate)
  AND vl.license_plate IS NOT NULL
  AND vl.license_plate != ''
  AND COALESCE(v.legacy_metadata->>'source', '') != 'vlms_vehicles';

-- Log update operations
INSERT INTO vehicle_merge_audit (vehicles_id, vlms_id, status, conflicts, resolved_conflicts, notes, metadata)
SELECT
  v.id,
  vl.id,
  CASE
    WHEN v.capacity_kg IS DISTINCT FROM vl.cargo_capacity OR v.make IS DISTINCT FROM vl.make OR v.model IS DISTINCT FROM vl.model
    THEN 'conflict'
    ELSE 'success'
  END,
  jsonb_build_object(
    'capacity_kg', CASE
      WHEN v.capacity_kg IS DISTINCT FROM vl.cargo_capacity
      THEN jsonb_build_object('vehicles', v.capacity_kg, 'vlms', vl.cargo_capacity)
      ELSE NULL
    END,
    'make', CASE
      WHEN v.make IS DISTINCT FROM vl.make
      THEN jsonb_build_object('vehicles', v.make, 'vlms', vl.make)
      ELSE NULL
    END
  ),
  jsonb_build_object(
    'capacity_kg', 'Used GREATEST() of both values',
    'make', 'Preferred vehicles table value'
  ),
  'Existing vehicle updated with data from vlms_vehicles',
  jsonb_build_object('operation', 'update', 'license_plate', vl.license_plate)
FROM vehicles v
INNER JOIN vlms_vehicles vl ON (v.license_plate = vl.license_plate OR v.plate_number = vl.license_plate)
WHERE v.legacy_metadata->>'vlms_merged' = 'true'
  AND v.legacy_metadata->>'migration_version' = '20251129000003';

COMMIT;

-- ============================================================================
-- Migration 4: Create Unified View
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW vehicles_unified_v AS
SELECT
  v.id,
  v.category_id,
  v.vehicle_type_id,
  v.fleet_id,
  v.make,
  v.model,
  v.year,
  v.license_plate,
  v.plate_number,
  v.vin,
  v.length_cm,
  v.width_cm,
  v.height_cm,
  v.capacity,
  v.capacity_kg,
  v.capacity_m3,
  v.capacity_weight_kg,
  v.capacity_volume_m3,
  v.max_weight,
  v.gross_vehicle_weight_kg,
  v.tiered_config,
  v.telematics_provider,
  v.telematics_id,
  v.number_of_axles,
  v.number_of_wheels,
  v.fuel_type,
  v.fuel_efficiency,
  v.avg_speed,
  v.engine_capacity,
  v.transmission,
  v.seating_capacity,
  v.acquisition_mode,
  v.acquisition_type,
  v.acquisition_date,
  v.date_acquired,
  v.purchase_price,
  v.current_book_value,
  v.depreciation_rate,
  v.insurance_expiry,
  v.insurance_policy_number,
  v.insurance_provider,
  v.registration_expiry,
  v.last_service_date,
  v.next_service_date,
  v.last_inspection_date,
  v.next_inspection_date,
  v.total_maintenance_cost,
  v.warranty_expiry,
  v.status,
  v.current_driver_id,
  v.current_location_id,
  v.current_mileage,
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
  v.legacy_metadata,
  v.created_at,
  v.created_by,
  v.updated_at,
  v.updated_by
FROM vehicles v;

COMMENT ON VIEW vehicles_unified_v IS 'Unified vehicle view for consolidation migration';

GRANT SELECT ON vehicles_unified_v TO authenticated;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT
  '✅ All 4 vehicle consolidation migrations completed successfully!' as status,
  (SELECT count(*) FROM vehicles) as total_vehicles,
  (SELECT count(*) FROM vlms_vehicles) as total_vlms_vehicles,
  (SELECT count(*) FROM vehicle_merge_audit) as merge_operations,
  (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'success') as successful_merges,
  (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'conflict') as conflicts;

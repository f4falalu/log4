-- ============================================================================
-- Vehicle Consolidation Audit - Step 3: Backfill from VLMS to Vehicles
-- ============================================================================
-- Purpose: Merge data from vlms_vehicles into canonical vehicles table
-- Strategy:
--   1. Insert new records from vlms_vehicles not in vehicles
--   2. Update existing records with merged data using reconciliation rules
--   3. Log all operations to vehicle_merge_audit table
-- ============================================================================

BEGIN;

-- ============================================================================
-- Phase 1: Insert New Vehicles from vlms_vehicles
-- ============================================================================
-- These are vehicles that exist only in vlms_vehicles, not in vehicles yet
-- We'll create new records in vehicles table for these

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

  -- Dimensions
  length_cm,
  width_cm,
  height_cm,

  -- Capacity
  capacity_kg,
  capacity_m3,
  capacity,
  avg_speed,
  fuel_efficiency,
  max_weight,

  -- Acquisition
  acquisition_mode,
  date_acquired,

  -- Insurance & Registration
  insurance_expiry,
  insurance_policy_number,
  insurance_provider,
  registration_expiry,

  -- Maintenance
  last_service_date,
  next_service_date,
  last_inspection_date,
  next_inspection_date,

  -- Financials
  purchase_price,
  current_book_value,
  depreciation_rate,

  -- Technical
  fuel_type,
  engine_capacity,
  transmission,
  seating_capacity,

  -- Metadata
  color,
  notes,
  tags,
  photos,
  documents,
  status,

  -- Audit
  created_at,
  created_by,
  updated_at,
  updated_by,

  -- Legacy tracking
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
  vl.license_plate, -- plate_number = license_plate
  vl.vin,

  -- Dimensions (vlms_vehicles doesn't have these)
  NULL::int,  -- length_cm
  NULL::int,  -- width_cm
  NULL::int,  -- height_cm

  -- Capacity
  vl.cargo_capacity,  -- capacity_kg (vlms uses cargo_capacity)
  NULL::numeric,  -- capacity_m3 - vlms_vehicles doesn't have this
  COALESCE(vl.cargo_capacity, 0),  -- capacity - required NOT NULL, use cargo_capacity or 0
  0,  -- avg_speed - required NOT NULL, default 0
  0,  -- fuel_efficiency - required NOT NULL, default 0
  COALESCE(vl.cargo_capacity, 0),  -- max_weight - required NOT NULL, use cargo_capacity or 0

  -- Acquisition
  vl.acquisition_type,
  vl.acquisition_date::date,

  -- Insurance & Registration
  vl.insurance_expiry::timestamptz,
  vl.insurance_policy_number,
  vl.insurance_provider,
  vl.registration_expiry::timestamptz,

  -- Maintenance
  vl.last_service_date::date,
  vl.next_service_date::date,
  vl.last_inspection_date::date,
  vl.next_inspection_date::date,

  -- Financials
  vl.purchase_price,
  vl.current_book_value,
  vl.depreciation_rate,

  -- Technical
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

  -- Metadata
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

  -- Audit
  COALESCE(vl.created_at, now()),
  vl.created_by,
  COALESCE(vl.updated_at, now()),
  vl.updated_by,

  -- Legacy tracking
  jsonb_build_object(
    'source', 'vlms_vehicles',
    'vlms_id', vl.id,
    'vehicle_type_text', vl.vehicle_type,
    'migrated_at', now(),
    'migration_version', '20251129000003'
  )
FROM vlms_vehicles vl
WHERE NOT EXISTS (
  -- Check if vehicle already exists by license_plate
  SELECT 1 FROM vehicles v
  WHERE v.license_plate = vl.license_plate
     OR v.plate_number = vl.license_plate
)
AND vl.license_plate IS NOT NULL
AND vl.license_plate != '';

-- Log insert operations
INSERT INTO vehicle_merge_audit (
  vehicles_id,
  vlms_id,
  status,
  notes,
  metadata
)
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
INNER JOIN vlms_vehicles vl
  ON v.license_plate = vl.license_plate
WHERE v.legacy_metadata->>'source' = 'vlms_vehicles'
  AND v.legacy_metadata->>'migration_version' = '20251129000003';

-- ============================================================================
-- Phase 2: Update Existing Vehicles with Merged Data
-- ============================================================================
-- Apply reconciliation rules for vehicles that exist in both tables

UPDATE vehicles v
SET
  -- Use GREATEST for capacity fields (prefer higher value)
  capacity_kg = GREATEST(
    COALESCE(v.capacity_kg, 0),
    COALESCE(vl.cargo_capacity, 0)
  ),

  -- vlms_vehicles doesn't have: capacity_m3, width_cm, height_cm, length_cm, tiered_config, fleet_id, category_id, vehicle_type_id

  -- Make/Model/Year: prefer vehicles (source of truth for registration)
  make = COALESCE(v.make, vl.make),
  model = COALESCE(v.model, vl.model),
  year = COALESCE(v.year, vl.year),
  vin = COALESCE(v.vin, vl.vin),

  -- Acquisition: prefer vlms (more recent data)
  acquisition_mode = COALESCE(vl.acquisition_type, v.acquisition_mode),
  date_acquired = COALESCE(vl.acquisition_date::date, v.date_acquired),

  -- Insurance: prefer vlms (more likely to be current)
  insurance_expiry = COALESCE(vl.insurance_expiry::timestamptz, v.insurance_expiry),
  insurance_policy_number = COALESCE(vl.insurance_policy_number, v.insurance_policy_number),
  insurance_provider = COALESCE(vl.insurance_provider, v.insurance_provider),
  registration_expiry = COALESCE(vl.registration_expiry::timestamptz, v.registration_expiry),

  -- Maintenance: prefer most recent dates
  last_service_date = CASE
    WHEN vl.last_service_date IS NOT NULL AND v.last_service_date IS NOT NULL
      THEN GREATEST(vl.last_service_date::date, v.last_service_date)
    ELSE COALESCE(vl.last_service_date::date, v.last_service_date)
  END,

  -- Technical
  color = COALESCE(v.color, vl.color),
  engine_capacity = COALESCE(v.engine_capacity, vl.engine_capacity),
  transmission = COALESCE(v.transmission, vl.transmission),
  seating_capacity = COALESCE(v.seating_capacity, vl.seating_capacity),

  -- Metadata
  notes = CASE
    WHEN v.notes IS NOT NULL AND vl.notes IS NOT NULL
      THEN v.notes || E'\n\n--- From VLMS ---\n' || vl.notes
    ELSE COALESCE(v.notes, vl.notes)
  END,

  -- Combine tags
  tags = CASE
    WHEN v.tags IS NOT NULL AND vl.tags IS NOT NULL
      THEN array(SELECT DISTINCT unnest(v.tags || vl.tags))
    ELSE COALESCE(v.tags, vl.tags)
  END,

  -- Updated timestamp
  updated_at = now(),

  -- Add legacy metadata showing merge occurred
  legacy_metadata = COALESCE(v.legacy_metadata, '{}'::jsonb) || jsonb_build_object(
    'vlms_merged', true,
    'vlms_id', vl.id,
    'vehicle_type_text', vl.vehicle_type,
    'merged_at', now(),
    'migration_version', '20251129000003',
    'conflicts', jsonb_build_object(
      'capacity_kg', CASE
        WHEN v.capacity_kg IS NOT NULL
          AND vl.cargo_capacity IS NOT NULL
          AND v.capacity_kg != vl.cargo_capacity
        THEN jsonb_build_object(
          'vehicles_value', v.capacity_kg,
          'vlms_value', vl.cargo_capacity,
          'resolved_value', GREATEST(v.capacity_kg, vl.cargo_capacity)
        )
        ELSE NULL
      END
    )
  )

FROM vlms_vehicles vl
WHERE (v.license_plate = vl.license_plate OR v.plate_number = vl.license_plate)
  AND vl.license_plate IS NOT NULL
  AND vl.license_plate != ''
  AND v.legacy_metadata->>'source' != 'vlms_vehicles'; -- Don't re-merge records we just inserted

-- Log update operations with conflict detection
INSERT INTO vehicle_merge_audit (
  vehicles_id,
  vlms_id,
  status,
  conflicts,
  resolved_conflicts,
  notes,
  metadata
)
SELECT
  v.id,
  vl.id,
  CASE
    WHEN v.capacity_kg IS DISTINCT FROM vl.cargo_capacity
      OR v.make IS DISTINCT FROM vl.make
      OR v.model IS DISTINCT FROM vl.model
    THEN 'conflict'
    ELSE 'success'
  END,

  -- Record conflicts
  jsonb_build_object(
    'capacity_kg', CASE
      WHEN v.capacity_kg IS DISTINCT FROM vl.cargo_capacity
      THEN jsonb_build_object(
        'vehicles', v.capacity_kg,
        'vlms', vl.cargo_capacity
      )
      ELSE NULL
    END,
    'make', CASE
      WHEN v.make IS DISTINCT FROM vl.make
      THEN jsonb_build_object(
        'vehicles', v.make,
        'vlms', vl.make
      )
      ELSE NULL
    END,
    'model', CASE
      WHEN v.model IS DISTINCT FROM vl.model
      THEN jsonb_build_object(
        'vehicles', v.model,
        'vlms', vl.model
      )
      ELSE NULL
    END
  ),

  -- Record how conflicts were resolved
  jsonb_build_object(
    'capacity_kg', 'Used GREATEST() of both values',
    'make', 'Preferred vehicles table value',
    'model', 'Preferred vehicles table value'
  ),

  'Existing vehicle updated with data from vlms_vehicles',

  jsonb_build_object(
    'operation', 'update',
    'license_plate', vl.license_plate,
    'fields_updated', array['capacity_kg', 'acquisition_mode', 'insurance_expiry', 'maintenance_dates']
  )
FROM vehicles v
INNER JOIN vlms_vehicles vl
  ON (v.license_plate = vl.license_plate OR v.plate_number = vl.license_plate)
WHERE v.legacy_metadata->>'vlms_merged' = 'true'
  AND v.legacy_metadata->>'migration_version' = '20251129000003';

COMMIT;

-- ============================================================================
-- Verification Queries (run after migration)
-- ============================================================================
--
-- -- Total counts
-- SELECT 'vehicles' as table_name, count(*) as count FROM vehicles
-- UNION ALL
-- SELECT 'vlms_vehicles', count(*) FROM vlms_vehicles
-- UNION ALL
-- SELECT 'vehicle_merge_audit', count(*) FROM vehicle_merge_audit;
--
-- -- Merge status breakdown
-- SELECT status, count(*) FROM vehicle_merge_audit GROUP BY status;
--
-- -- Conflicts detected
-- SELECT
--   vehicles_id,
--   vlms_id,
--   conflicts
-- FROM vehicle_merge_audit
-- WHERE status = 'conflict'
-- LIMIT 10;
--
-- -- Spot check merged data
-- SELECT
--   v.id,
--   v.license_plate,
--   v.make,
--   v.model,
--   v.capacity_kg,
--   v.capacity_m3,
--   v.legacy_metadata
-- FROM vehicles v
-- WHERE v.legacy_metadata->>'vlms_merged' = 'true'
-- ORDER BY random()
-- LIMIT 20;

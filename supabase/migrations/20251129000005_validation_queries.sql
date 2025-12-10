-- ============================================================================
-- Vehicle Consolidation Audit - Step 5: Validation Queries
-- ============================================================================
-- Purpose: Verify data integrity after migration
-- Run these queries after backfill to ensure migration was successful
-- DO NOT RUN IN TRANSACTION - These are SELECT queries for validation
-- ============================================================================

-- ============================================================================
-- 1. Record Count Validation
-- ============================================================================
-- Verify total counts match expectations

SELECT '=== RECORD COUNTS ===' as check_type;

SELECT
  'vehicles' as table_name,
  count(*) as total_count
FROM vehicles

UNION ALL

SELECT
  'vlms_vehicles',
  count(*)
FROM vlms_vehicles

UNION ALL

SELECT
  'vehicle_merge_audit',
  count(*)
FROM vehicle_merge_audit

UNION ALL

SELECT
  'vehicles (from vlms)',
  count(*)
FROM vehicles
WHERE legacy_metadata->>'source' = 'vlms_vehicles'

UNION ALL

SELECT
  'vehicles (merged with vlms)',
  count(*)
FROM vehicles
WHERE legacy_metadata->>'vlms_merged' = 'true';

-- ============================================================================
-- 2. Merge Status Breakdown
-- ============================================================================
-- Check how many vehicles were inserted vs updated vs had conflicts

SELECT '=== MERGE STATUS ===' as check_type;

SELECT
  status,
  count(*) as count,
  round(count(*) * 100.0 / sum(count(*)) OVER (), 2) as percentage
FROM vehicle_merge_audit
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- 3. Duplicate Detection
-- ============================================================================
-- Ensure no duplicate license plates after migration

SELECT '=== DUPLICATE LICENSE PLATES ===' as check_type;

SELECT
  license_plate,
  count(*) as duplicate_count
FROM vehicles
WHERE license_plate IS NOT NULL
  AND license_plate != ''
GROUP BY license_plate
HAVING count(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Also check plate_number field
SELECT
  plate_number,
  count(*) as duplicate_count
FROM vehicles
WHERE plate_number IS NOT NULL
  AND plate_number != ''
GROUP BY plate_number
HAVING count(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- ============================================================================
-- 4. Missing Critical Fields
-- ============================================================================
-- Check for NULL values in important fields

SELECT '=== MISSING CRITICAL FIELDS ===' as check_type;

SELECT
  COUNT(*) FILTER (WHERE license_plate IS NULL OR license_plate = '') as missing_license_plate,
  COUNT(*) FILTER (WHERE plate_number IS NULL OR plate_number = '') as missing_plate_number,
  COUNT(*) FILTER (WHERE make IS NULL OR make = '') as missing_make,
  COUNT(*) FILTER (WHERE model IS NULL OR model = '') as missing_model,
  COUNT(*) FILTER (WHERE capacity_kg IS NULL) as missing_capacity_kg,
  COUNT(*) FILTER (WHERE capacity_m3 IS NULL) as missing_capacity_m3,
  COUNT(*) FILTER (WHERE tiered_config IS NULL) as missing_tiered_config,
  COUNT(*) FILTER (WHERE category_id IS NULL) as missing_category,
  COUNT(*) FILTER (WHERE vehicle_type_id IS NULL) as missing_vehicle_type,
  COUNT(*) as total_vehicles
FROM vehicles;

-- ============================================================================
-- 5. Conflict Analysis
-- ============================================================================
-- Review conflicts that were detected and how they were resolved

SELECT '=== CONFLICTS DETECTED ===' as check_type;

SELECT
  vehicles_id,
  vlms_id,
  conflicts,
  resolved_conflicts,
  notes
FROM vehicle_merge_audit
WHERE status = 'conflict'
  AND conflicts != '{}'::jsonb
LIMIT 10;

-- Summary of conflict types
SELECT
  jsonb_object_keys(conflicts) as conflict_field,
  count(*) as occurrences
FROM vehicle_merge_audit
WHERE conflicts != '{}'::jsonb
GROUP BY conflict_field
ORDER BY occurrences DESC;

-- ============================================================================
-- 6. Data Quality Checks
-- ============================================================================
-- Validate data ranges and consistency

SELECT '=== DATA QUALITY CHECKS ===' as check_type;

-- Check for unreasonable capacity values
SELECT
  'capacity_kg > 50000' as check_name,
  count(*) as failing_count
FROM vehicles
WHERE capacity_kg > 50000 -- > 50 tons is unusual for most vehicles

UNION ALL

SELECT
  'capacity_m3 > 200',
  count(*)
FROM vehicles
WHERE capacity_m3 > 200 -- > 200 cubic meters is very large

UNION ALL

SELECT
  'year < 1900 or year > 2030',
  count(*)
FROM vehicles
WHERE year < 1900 OR year > 2030

UNION ALL

SELECT
  'negative dimensions',
  count(*)
FROM vehicles
WHERE length_cm < 0 OR width_cm < 0 OR height_cm < 0;

-- ============================================================================
-- 7. Telematics Data Check
-- ============================================================================
-- Verify telematics provider and ID mappings

SELECT '=== TELEMATICS DATA ===' as check_type;

SELECT
  telematics_provider,
  count(*) as vehicle_count,
  count(telematics_id) as with_telematics_id
FROM vehicles
WHERE telematics_provider IS NOT NULL
GROUP BY telematics_provider
ORDER BY vehicle_count DESC;

-- ============================================================================
-- 8. Sample Data Verification
-- ============================================================================
-- Random sample of merged vehicles for manual review

SELECT '=== SAMPLE MERGED VEHICLES ===' as check_type;

SELECT
  v.id,
  v.license_plate,
  v.make,
  v.model,
  v.year,
  v.capacity_kg,
  v.capacity_m3,
  v.tiered_config,
  v.category_id,
  v.vehicle_type_id,
  v.telematics_provider,
  v.legacy_metadata->>'vlms_id' as vlms_id,
  v.legacy_metadata->>'vlms_merged' as was_merged,
  v.legacy_metadata->>'source' as source
FROM vehicles v
WHERE v.legacy_metadata->>'migration_version' = '20251129000003'
ORDER BY random()
LIMIT 20;

-- ============================================================================
-- 9. Orphan Detection
-- ============================================================================
-- Check for vehicles in vlms_vehicles that didn't make it to vehicles

SELECT '=== ORPHANED VLMS VEHICLES ===' as check_type;

SELECT
  vl.id as vlms_id,
  vl.license_plate,
  vl.make,
  vl.model,
  vl.year
FROM vlms_vehicles vl
WHERE NOT EXISTS (
  SELECT 1
  FROM vehicles v
  WHERE v.license_plate = vl.license_plate
     OR v.plate_number = vl.license_plate
)
AND vl.license_plate IS NOT NULL
AND vl.license_plate != ''
LIMIT 20;

-- Count orphans
SELECT
  'Total orphaned vlms_vehicles' as check_name,
  count(*) as count
FROM vlms_vehicles vl
WHERE NOT EXISTS (
  SELECT 1
  FROM vehicles v
  WHERE v.license_plate = vl.license_plate
     OR v.plate_number = vl.license_plate
)
AND vl.license_plate IS NOT NULL
AND vl.license_plate != '';

-- ============================================================================
-- 10. Migration Completeness
-- ============================================================================
-- Final summary of migration results

SELECT '=== MIGRATION SUMMARY ===' as check_type;

SELECT
  jsonb_build_object(
    'total_vehicles', (SELECT count(*) FROM vehicles),
    'total_vlms_vehicles', (SELECT count(*) FROM vlms_vehicles),
    'inserted_from_vlms', (SELECT count(*) FROM vehicles WHERE legacy_metadata->>'source' = 'vlms_vehicles'),
    'merged_with_vlms', (SELECT count(*) FROM vehicles WHERE legacy_metadata->>'vlms_merged' = 'true'),
    'merge_operations', (SELECT count(*) FROM vehicle_merge_audit),
    'successful_merges', (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'success'),
    'conflicts', (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'conflict'),
    'failed', (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'failed'),
    'duplicate_license_plates', (
      SELECT count(*) FROM (
        SELECT license_plate FROM vehicles
        WHERE license_plate IS NOT NULL
        GROUP BY license_plate
        HAVING count(*) > 1
      ) dupes
    ),
    'vehicles_missing_capacity', (SELECT count(*) FROM vehicles WHERE capacity_kg IS NULL AND capacity_m3 IS NULL)
  ) as migration_summary;

-- ============================================================================
-- ACCEPTANCE CRITERIA VALIDATION
-- ============================================================================
-- These checks must ALL pass for migration to be considered successful

SELECT '=== ACCEPTANCE CRITERIA ===' as check_type;

SELECT
  CASE
    WHEN (SELECT count(*) FROM vehicles) >= (SELECT count(*) FROM vlms_vehicles)
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as criterion_1,
  'No data loss - vehicles count >= vlms_vehicles count' as description

UNION ALL

SELECT
  CASE
    WHEN (SELECT count(*) FROM (
      SELECT license_plate FROM vehicles
      WHERE license_plate IS NOT NULL AND license_plate != ''
      GROUP BY license_plate
      HAVING count(*) > 1
    ) dupes) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'No duplicate license plates'

UNION ALL

SELECT
  CASE
    WHEN (SELECT count(*) FROM vehicles WHERE capacity_kg IS NULL AND capacity_m3 IS NULL) < (
      SELECT count(*) * 0.1 FROM vehicles  -- Less than 10% missing capacity
    )
    THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END,
  'Acceptable capacity data completeness (>90%)'

UNION ALL

SELECT
  CASE
    WHEN (SELECT count(*) FROM vehicle_merge_audit WHERE status = 'failed') = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'No failed merge operations'

UNION ALL

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM vehicles_unified_v LIMIT 1)
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'Unified view created successfully'

UNION ALL

SELECT
  CASE
    WHEN (SELECT count(*) FROM vehicle_merge_audit) > 0
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END,
  'Audit trail populated'

UNION ALL

SELECT
  CASE
    WHEN (SELECT count(*) FROM vehicles WHERE year < 1900 OR year > 2030) = 0
    THEN '✅ PASS'
    ELSE '⚠️  WARN'
  END,
  'Reasonable year values';

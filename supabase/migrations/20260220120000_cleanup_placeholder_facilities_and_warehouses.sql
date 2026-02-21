-- =====================================================
-- CLEANUP PLACEHOLDER FACILITIES AND WAREHOUSES
-- =====================================================
-- Purpose: Remove placeholder/sample facilities and warehouses
-- Date: 2026-02-20
-- Note: These are test/sample entities with repeating UUID patterns
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE SERVICE AREA FACILITY ASSIGNMENTS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete service area assignments for placeholder facilities
  DELETE FROM service_area_facilities
  WHERE facility_id::text IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'f5555555-5555-5555-5555-555555555555'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % service area facility assignments for placeholders', deleted_count;
END $$;

-- =====================================================
-- 2. DELETE REQUISITIONS REFERENCING PLACEHOLDER FACILITIES/WAREHOUSES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete requisitions that reference placeholder facilities or warehouses
  -- This is necessary due to FK constraints
  DELETE FROM requisitions
  WHERE facility_id::text IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'f5555555-5555-5555-5555-555555555555'
  )
  OR warehouse_id::text IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % requisitions referencing placeholders', deleted_count;
END $$;

-- =====================================================
-- 3. DELETE ROUTES REFERENCING PLACEHOLDER FACILITIES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete routes that include placeholder facilities
  DELETE FROM routes
  WHERE id IN (
    SELECT DISTINCT route_id
    FROM route_facilities
    WHERE facility_id::text IN (
      'f1111111-1111-1111-1111-111111111111',
      'f2222222-2222-2222-2222-222222222222',
      'f3333333-3333-3333-3333-333333333333',
      'f4444444-4444-4444-4444-444444444444',
      'f5555555-5555-5555-5555-555555555555'
    )
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % routes with placeholder facilities', deleted_count;
END $$;

-- =====================================================
-- 4. DELETE DELIVERY SCHEDULES REFERENCING PLACEHOLDER WAREHOUSES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete delivery schedules that reference placeholder warehouses
  -- facility_ids is an array, so we use the overlap operator
  DELETE FROM delivery_schedules
  WHERE warehouse_id::text IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  )
  OR facility_ids && ARRAY[
    'f1111111-1111-1111-1111-111111111111'::uuid,
    'f2222222-2222-2222-2222-222222222222'::uuid,
    'f3333333-3333-3333-3333-333333333333'::uuid,
    'f4444444-4444-4444-4444-444444444444'::uuid,
    'f5555555-5555-5555-5555-555555555555'::uuid
  ];

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % delivery schedules referencing placeholders', deleted_count;
END $$;

-- =====================================================
-- 5. DELETE PLACEHOLDER FACILITIES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete placeholder facilities (repeating UUID pattern f1111111-..., f2222222-..., etc.)
  DELETE FROM facilities
  WHERE id::text IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'f5555555-5555-5555-5555-555555555555'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % placeholder facilities', deleted_count;
END $$;

-- =====================================================
-- 6. DELETE PLACEHOLDER WAREHOUSES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete placeholder warehouses (repeating UUID pattern 11111111-..., 22222222-..., etc.)
  DELETE FROM warehouses
  WHERE id::text IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % placeholder warehouses', deleted_count;
END $$;

-- =====================================================
-- 7. VERIFY CLEANUP AND FINAL STATE
-- =====================================================

DO $$
DECLARE
  remaining_facilities INTEGER;
  remaining_warehouses INTEGER;
  remaining_zones INTEGER;
  remaining_service_areas INTEGER;
BEGIN
  -- Count remaining records
  SELECT COUNT(*) INTO remaining_facilities FROM facilities;
  SELECT COUNT(*) INTO remaining_warehouses FROM warehouses;
  SELECT COUNT(*) INTO remaining_zones FROM zones;
  SELECT COUNT(*) INTO remaining_service_areas FROM service_areas;

  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL DATABASE STATE:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   Facilities: %', remaining_facilities;
  RAISE NOTICE '   Warehouses: %', remaining_warehouses;
  RAISE NOTICE '   Zones: %', remaining_zones;
  RAISE NOTICE '   Service Areas: %', remaining_service_areas;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  IF remaining_facilities = 0 THEN
    RAISE NOTICE '✅ All sample facilities removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % facilities remain (real data)', remaining_facilities;
  END IF;

  IF remaining_warehouses = 0 THEN
    RAISE NOTICE '✅ All sample warehouses removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % warehouses remain (real data)', remaining_warehouses;
  END IF;

  IF remaining_zones = 0 THEN
    RAISE NOTICE '✅ All sample zones removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % zones remain (real data)', remaining_zones;
  END IF;

  IF remaining_service_areas = 0 THEN
    RAISE NOTICE '✅ All sample service areas removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % service areas remain (real data)', remaining_service_areas;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create real warehouse locations via Warehouse page';
  RAISE NOTICE '2. Register real facilities via Facilities import/creation';
  RAISE NOTICE '3. Define operational zones for your coverage areas';
  RAISE NOTICE '4. Create service areas to organize facility deliveries';
  RAISE NOTICE '';
END $$;

COMMIT;

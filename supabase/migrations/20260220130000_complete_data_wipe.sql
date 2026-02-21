-- =====================================================
-- COMPLETE DATA WIPE - REMOVE ALL TEST/MOCK DATA
-- =====================================================
-- Purpose: Remove ALL facilities, warehouses, zones, and service areas
-- This will leave the database completely clean for production use
-- Date: 2026-02-20
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE ALL SERVICE AREA FACILITY ASSIGNMENTS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM service_area_facilities;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % service area facility assignments', deleted_count;
END $$;

-- =====================================================
-- 2. TEMPORARILY DROP ALL FK CONSTRAINTS TO ALLOW DELETION
-- =====================================================

DO $$
BEGIN
  -- Drop FK constraints from routes table (we'll delete everything anyway)
  ALTER TABLE IF EXISTS public.routes DROP CONSTRAINT IF EXISTS routes_service_area_id_fkey;
  ALTER TABLE IF EXISTS public.routes DROP CONSTRAINT IF EXISTS routes_warehouse_id_fkey;
  ALTER TABLE IF EXISTS public.routes DROP CONSTRAINT IF EXISTS routes_zone_id_fkey;
  RAISE NOTICE '✓ Dropped FK constraints from routes table';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Note: Could not drop some FK constraints (may not exist)';
END $$;

-- =====================================================
-- 3. DELETE ALL ROUTE FACILITIES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.route_facilities;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % route facility assignments', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: route_facilities table does not exist';
END $$;

-- =====================================================
-- 4. DELETE ALL ROUTE SKETCHES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.route_sketches;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % route sketches', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: route_sketches table does not exist';
END $$;

-- =====================================================
-- 5. DELETE ALL ROUTES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.routes;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % routes', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: routes table does not exist';
END $$;

-- =====================================================
-- 6. DELETE ALL SERVICE AREAS (after routes deleted)
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM service_areas;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % service areas', deleted_count;
END $$;

-- =====================================================
-- 7. DELETE ALL ZONES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM zones;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % zones', deleted_count;
END $$;

-- =====================================================
-- 8. DELETE ALL DELIVERY SCHEDULES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM delivery_schedules;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % delivery schedules', deleted_count;
END $$;

-- =====================================================
-- 9. DELETE ALL REQUISITIONS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM requisitions;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % requisitions', deleted_count;
END $$;

-- =====================================================
-- 10. DELETE ALL FACILITIES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM facilities;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % facilities', deleted_count;
END $$;

-- =====================================================
-- 11. DELETE ALL WAREHOUSES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM warehouses;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % warehouses', deleted_count;
END $$;

-- =====================================================
-- 12. VERIFY COMPLETE CLEANUP
-- =====================================================

DO $$
DECLARE
  remaining_facilities INTEGER;
  remaining_warehouses INTEGER;
  remaining_zones INTEGER;
  remaining_service_areas INTEGER;
  remaining_routes INTEGER;
  remaining_schedules INTEGER;
  remaining_requisitions INTEGER;
BEGIN
  -- Count remaining records
  SELECT COUNT(*) INTO remaining_facilities FROM facilities;
  SELECT COUNT(*) INTO remaining_warehouses FROM warehouses;
  SELECT COUNT(*) INTO remaining_zones FROM zones;
  SELECT COUNT(*) INTO remaining_service_areas FROM service_areas;

  SELECT COUNT(*) INTO remaining_routes
  FROM information_schema.tables
  WHERE table_name = 'routes';

  IF remaining_routes > 0 THEN
    SELECT COUNT(*) INTO remaining_routes FROM routes;
  END IF;

  SELECT COUNT(*) INTO remaining_schedules FROM delivery_schedules;
  SELECT COUNT(*) INTO remaining_requisitions FROM requisitions;

  RAISE NOTICE '';
  RAISE NOTICE '📊 COMPLETE DATABASE WIPE - FINAL STATE:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   Facilities: %', remaining_facilities;
  RAISE NOTICE '   Warehouses: %', remaining_warehouses;
  RAISE NOTICE '   Zones: %', remaining_zones;
  RAISE NOTICE '   Service Areas: %', remaining_service_areas;
  RAISE NOTICE '   Routes: %', remaining_routes;
  RAISE NOTICE '   Delivery Schedules: %', remaining_schedules;
  RAISE NOTICE '   Requisitions: %', remaining_requisitions;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  IF remaining_facilities = 0 AND remaining_warehouses = 0 AND
     remaining_zones = 0 AND remaining_service_areas = 0 THEN
    RAISE NOTICE '✅ COMPLETE WIPE SUCCESSFUL!';
    RAISE NOTICE '   Database is now completely clean.';
    RAISE NOTICE '   Map should show NO facilities, warehouses, or zones.';
  ELSE
    RAISE NOTICE '⚠️  Some data remains:';
    IF remaining_facilities > 0 THEN
      RAISE NOTICE '   - % facilities still exist', remaining_facilities;
    END IF;
    IF remaining_warehouses > 0 THEN
      RAISE NOTICE '   - % warehouses still exist', remaining_warehouses;
    END IF;
    IF remaining_zones > 0 THEN
      RAISE NOTICE '   - % zones still exist', remaining_zones;
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify map shows empty state (0 facilities, 0 warehouses, 0 zones)';
  RAISE NOTICE '2. Import REAL production data when ready';
  RAISE NOTICE '3. Test with actual operational data only';
  RAISE NOTICE '';
END $$;

COMMIT;

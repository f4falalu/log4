-- =====================================================
-- COMPLETE VEHICLE DATA WIPE
-- =====================================================
-- Purpose: Remove ALL vehicles and related data
-- Date: 2026-02-20
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE ALL DELIVERY BATCHES (references vehicles)
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM delivery_batches;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % delivery batches', deleted_count;
END $$;

-- =====================================================
-- 2. DELETE ALL VLMS MAINTENANCE RECORDS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vlms_maintenance_records;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % VLMS maintenance records', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: vlms_maintenance_records table does not exist';
END $$;

-- =====================================================
-- 3. DELETE ALL VLMS FUEL LOGS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vlms_fuel_logs;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % VLMS fuel logs', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: vlms_fuel_logs table does not exist';
END $$;

-- =====================================================
-- 4. DELETE ALL VLMS VEHICLES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vlms_vehicles;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % VLMS vehicles', deleted_count;
END $$;

-- =====================================================
-- 5. DELETE ALL VEHICLES (main table)
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vehicles;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % vehicles from main table', deleted_count;
END $$;

-- =====================================================
-- 6. DELETE ALL PAYLOAD ITEMS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM payload_items;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % payload items', deleted_count;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Note: payload_items table does not exist';
END $$;

-- =====================================================
-- 7. VERIFY COMPLETE VEHICLE CLEANUP
-- =====================================================

DO $$
DECLARE
  remaining_vehicles INTEGER;
  remaining_vlms_vehicles INTEGER;
  remaining_batches INTEGER;
  remaining_maintenance INTEGER := 0;
  remaining_fuel_logs INTEGER := 0;
BEGIN
  -- Count remaining records
  SELECT COUNT(*) INTO remaining_vehicles FROM vehicles;
  SELECT COUNT(*) INTO remaining_vlms_vehicles FROM vlms_vehicles;
  SELECT COUNT(*) INTO remaining_batches FROM delivery_batches;

  -- Check maintenance records if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vlms_maintenance_records') THEN
    SELECT COUNT(*) INTO remaining_maintenance FROM vlms_maintenance_records;
  END IF;

  -- Check fuel logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vlms_fuel_logs') THEN
    SELECT COUNT(*) INTO remaining_fuel_logs FROM vlms_fuel_logs;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 COMPLETE VEHICLE WIPE - FINAL STATE:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   Main Vehicles: %', remaining_vehicles;
  RAISE NOTICE '   VLMS Vehicles: %', remaining_vlms_vehicles;
  RAISE NOTICE '   Delivery Batches: %', remaining_batches;
  RAISE NOTICE '   Maintenance Records: %', remaining_maintenance;
  RAISE NOTICE '   Fuel Logs: %', remaining_fuel_logs;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  IF remaining_vehicles = 0 AND remaining_vlms_vehicles = 0 AND remaining_batches = 0 THEN
    RAISE NOTICE '✅ COMPLETE VEHICLE WIPE SUCCESSFUL!';
    RAISE NOTICE '   All vehicle data has been removed.';
    RAISE NOTICE '   Map, VLMS, and Fleet Management should show 0 vehicles.';
  ELSE
    RAISE NOTICE '⚠️  Some vehicle data remains:';
    IF remaining_vehicles > 0 THEN
      RAISE NOTICE '   - % vehicles in main table', remaining_vehicles;
    END IF;
    IF remaining_vlms_vehicles > 0 THEN
      RAISE NOTICE '   - % VLMS vehicles', remaining_vlms_vehicles;
    END IF;
    IF remaining_batches > 0 THEN
      RAISE NOTICE '   - % delivery batches', remaining_batches;
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Expected state:';
  RAISE NOTICE '- Map: 0 vehicles';
  RAISE NOTICE '- VLMS: Empty vehicle list';
  RAISE NOTICE '- Fleet Management: 0 vehicles';
  RAISE NOTICE '';
END $$;

COMMIT;

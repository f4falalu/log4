-- =====================================================
-- CLEANUP SAMPLE VEHICLES FROM MAIN VEHICLES TABLE
-- =====================================================
-- Purpose: Remove sample vehicles that were backfilled from vlms_vehicles
-- Date: 2026-02-20
-- Note: Previous cleanup removed from vlms_vehicles, but vehicles table
--       was populated via backfill migration, so we need to clean it too
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE DELIVERY BATCHES USING SAMPLE VEHICLES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First, delete delivery batches that reference sample vehicles
  -- This is necessary due to FK constraint: delivery_batches.vehicle_id -> vehicles.id
  DELETE FROM delivery_batches
  WHERE vehicle_id IN (
    SELECT id FROM vehicles
    WHERE vin LIKE 'JTFDE626%'
    OR license_plate IN ('KN-1234-ABC', 'KN-5678-DEF', 'KN-9012-GHI', 'KN-3456-JKL', 'KN-7890-MNO')
    OR plate_number IN ('KN-1234-ABC', 'KN-5678-DEF', 'KN-9012-GHI', 'KN-3456-JKL', 'KN-7890-MNO')
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % delivery batches using sample vehicles', deleted_count;
END $$;

-- =====================================================
-- 2. DELETE SAMPLE VEHICLES FROM VEHICLES TABLE
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample vehicles with test VINs and license plates
  -- These match the sample data from 20241113000001_vlms_seed.sql
  DELETE FROM vehicles
  WHERE vin LIKE 'JTFDE626%' -- Sample VINs from seed file
  OR license_plate IN (
    'KN-1234-ABC',  -- Toyota Hilux
    'KN-5678-DEF',  -- Honda CR-V
    'KN-9012-GHI',  -- Nissan Patrol
    'KN-3456-JKL',  -- Toyota Corolla
    'KN-7890-MNO'   -- Mitsubishi L200
  )
  OR plate_number IN (
    'KN-1234-ABC',
    'KN-5678-DEF',
    'KN-9012-GHI',
    'KN-3456-JKL',
    'KN-7890-MNO'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample vehicles from vehicles table', deleted_count;
END $$;

-- =====================================================
-- 3. VERIFY CLEANUP
-- =====================================================

DO $$
DECLARE
  remaining_vlms INTEGER;
  remaining_vehicles INTEGER;
  remaining_batches INTEGER;
BEGIN
  -- Count remaining records in tables
  SELECT COUNT(*) INTO remaining_vlms FROM vlms_vehicles;
  SELECT COUNT(*) INTO remaining_vehicles FROM vehicles;
  SELECT COUNT(*) INTO remaining_batches FROM delivery_batches;

  RAISE NOTICE '';
  RAISE NOTICE '📊 DATABASE STATE AFTER CLEANUP:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   vlms_vehicles: %', remaining_vlms;
  RAISE NOTICE '   vehicles (main): %', remaining_vehicles;
  RAISE NOTICE '   delivery_batches: %', remaining_batches;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  IF remaining_vehicles = 0 THEN
    RAISE NOTICE '✅ All sample vehicles removed from main vehicles table.';
    RAISE NOTICE '   Ready for production vehicle registration.';
  ELSE
    RAISE NOTICE '💡 % vehicles remain (real data)', remaining_vehicles;
  END IF;

  IF remaining_batches = 0 THEN
    RAISE NOTICE '✅ All sample delivery batches removed.';
  ELSE
    RAISE NOTICE '💡 % delivery batches remain (real data)', remaining_batches;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Register real vehicles via VLMS onboarding workflow';
  RAISE NOTICE '2. Assign vehicles to fleets';
  RAISE NOTICE '3. Create real delivery batches';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- FLEET & VENDOR SAMPLE DATA CLEANUP
-- =====================================================
-- Purpose: Remove sample fleets and vendors from fleet management
-- Date: 2026-02-20
-- Safe to run: Uses existence checks and transactions
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DELETE SAMPLE FLEETS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample fleets by name
  -- These were created in 20251021154000_fleet_management_schema.sql
  DELETE FROM fleets
  WHERE name IN (
    'Main Fleet',
    'Northern Operations'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample fleets', deleted_count;
END $$;

-- =====================================================
-- 2. DELETE SAMPLE VENDORS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample vendors by name
  -- These were created in 20251021154000_fleet_management_schema.sql
  DELETE FROM vendors
  WHERE name IN (
    'BIKO Logistics',
    'Partner Transport Co',
    'Regional Delivery Services'
  )
  AND email IN (
    'fleet@biko.ng',
    'ops@partnertransport.ng',
    'contact@regionaldelivery.ng'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample vendors', deleted_count;
END $$;

-- =====================================================
-- 3. FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  fleet_count INTEGER;
  vendor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fleet_count FROM fleets;
  SELECT COUNT(*) INTO vendor_count FROM vendors;

  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL COUNT:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   Fleets remaining: %', fleet_count;
  RAISE NOTICE '   Vendors remaining: %', vendor_count;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  IF fleet_count = 0 THEN
    RAISE NOTICE '✅ All sample fleets removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % fleets remain (real data)', fleet_count;
  END IF;

  IF vendor_count = 0 THEN
    RAISE NOTICE '✅ All sample vendors removed. Ready for production data.';
  ELSE
    RAISE NOTICE '💡 % vendors remain (real data)', vendor_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create real vendor organizations';
  RAISE NOTICE '2. Register fleet ownership under vendors';
  RAISE NOTICE '3. Assign vehicles to fleets';
  RAISE NOTICE '';
END $$;

COMMIT;

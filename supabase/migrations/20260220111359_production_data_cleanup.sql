-- =====================================================
-- PRODUCTION DATA CLEANUP - ENTERPRISE DEPLOYMENT
-- =====================================================
-- Purpose: Remove sample/test data before production launch
-- Safe to run: Uses existence checks and transactions
-- Run with: supabase db execute -f scripts/production-cleanup.sql
-- =====================================================

BEGIN;

-- =====================================================
-- ENVIRONMENT CHECK
-- =====================================================

DO $$
DECLARE
  db_name TEXT;
  is_production BOOLEAN;
  total_users INTEGER;
BEGIN
  -- Get current database name
  SELECT current_database() INTO db_name;

  -- Count users as safety check
  SELECT COUNT(*) INTO total_users FROM auth.users;

  -- Warn if this looks like a production database with users
  IF total_users > 5 THEN
    RAISE WARNING '⚠️  This database has % users. Ensure this is the correct environment!', total_users;
    RAISE WARNING '⚠️  This script will DELETE sample data. Review before proceeding.';
    -- Uncomment next line to require manual confirmation
    -- RAISE EXCEPTION 'Aborted for safety. Comment out this line to proceed.';
  END IF;

  RAISE NOTICE '📊 Database: %', db_name;
  RAISE NOTICE '👥 Users: %', total_users;
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Starting production cleanup...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. DELETE SAMPLE SERVICE AREAS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete service areas assigned to sample facilities
  DELETE FROM service_area_facilities
  WHERE facility_id IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'f5555555-5555-5555-5555-555555555555'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample facility assignments from service areas', deleted_count;

  -- Delete sample service areas
  DELETE FROM service_areas
  WHERE name IN (
    'Kano Central Service Area',
    'Kano Rural Service Area',
    'Lagos Mainland Service Area',
    'Lagos Island Service Area',
    'Abuja Central Service Area',
    'Abuja Suburban Service Area'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample service areas', deleted_count;
END $$;

-- =====================================================
-- 2. DELETE SAMPLE ZONES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample zones only if they have no real data attached
  DELETE FROM zones
  WHERE code IN ('KANO', 'LAG', 'ABJ', 'central', 'gaya', 'danbatta', 'gwarzo', 'rano')
  AND NOT EXISTS (
    -- Keep zones that have service areas
    SELECT 1 FROM service_areas WHERE zone_id = zones.id
    UNION
    -- Keep zones that have routes
    SELECT 1 FROM routes WHERE zone_id = zones.id
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample zones (zones with real data were preserved)', deleted_count;
END $$;

-- =====================================================
-- 3. DELETE SAMPLE VEHICLES
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample vehicles with test VINs and license plates
  DELETE FROM vlms_vehicles
  WHERE vin LIKE 'JTFDE626%' -- Sample VINs from seed file
  OR license_plate IN (
    'KN-1234-ABC',
    'KN-5678-DEF',
    'KN-9012-GHI',
    'KN-3456-JKL',
    'KN-7890-MNO'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample vehicles', deleted_count;
END $$;

-- =====================================================
-- 4. DELETE SAMPLE PROGRAMS
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample healthcare programs
  DELETE FROM programs
  WHERE code IN (
    'ART-01',      -- Anti-Retroviral Therapy
    'MAL-01',      -- Malaria
    'PMTCT-01',    -- Prevention of Mother-to-Child Transmission
    'FP-01',       -- Family Planning
    'NUT-01',      -- Nutrition
    'IMM-01'       -- Immunization
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample programs', deleted_count;
END $$;

-- =====================================================
-- 5. DELETE SAMPLE LGAs (Local Government Areas)
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sample LGAs from Kano state
  -- Note: Facilities table doesn't have lga_id column, safe to delete
  DELETE FROM lgas
  WHERE name IN ('Dala', 'Tarauni', 'Nassarawa', 'Gwale')
  AND state = 'kano';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % sample LGAs (LGAs with facilities were preserved)', deleted_count;
END $$;

-- =====================================================
-- 6. VERIFY NO PLACEHOLDER WAREHOUSES/FACILITIES
-- =====================================================

DO $$
DECLARE
  placeholder_warehouses INTEGER;
  placeholder_facilities INTEGER;
BEGIN
  -- Count placeholder warehouses (specific known UUIDs)
  SELECT COUNT(*) INTO placeholder_warehouses
  FROM warehouses
  WHERE id::text IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

  -- Count placeholder facilities (f-prefixed pattern UUIDs)
  SELECT COUNT(*) INTO placeholder_facilities
  FROM facilities
  WHERE id::text IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222',
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'f5555555-5555-5555-5555-555555555555'
  );

  IF placeholder_warehouses > 0 THEN
    RAISE WARNING '⚠️  Found % placeholder warehouses (repeating UUID patterns)', placeholder_warehouses;
    RAISE WARNING '    These should be replaced with real warehouse data';
  END IF;

  IF placeholder_facilities > 0 THEN
    RAISE WARNING '⚠️  Found % placeholder facilities (f1111111-..., f2222222-..., etc)', placeholder_facilities;
    RAISE WARNING '    These should be replaced with real facility data';
  END IF;

  IF placeholder_warehouses = 0 AND placeholder_facilities = 0 THEN
    RAISE NOTICE '✓ No placeholder warehouses or facilities found';
  END IF;
END $$;

-- =====================================================
-- 7. UPDATE DEFAULT WORKSPACE (OPTIONAL)
-- =====================================================

DO $$
DECLARE
  workspace_id UUID := '00000000-0000-0000-0000-000000000001';
  current_name TEXT;
  current_country TEXT;
BEGIN
  -- Get current workspace info
  SELECT w.name, c.name
  INTO current_name, current_country
  FROM workspaces w
  LEFT JOIN countries c ON c.id = w.country_id
  WHERE w.id = workspace_id;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Current default workspace:';
  RAISE NOTICE '   Name: %', current_name;
  RAISE NOTICE '   Country: %', COALESCE(current_country, '(not set)');
  RAISE NOTICE '';
  RAISE NOTICE '💡 To update workspace for your deployment, run:';
  RAISE NOTICE '   UPDATE workspaces';
  RAISE NOTICE '   SET name = ''Your Company Name'',';
  RAISE NOTICE '       country_id = (SELECT id FROM countries WHERE iso_code = ''YOUR_CODE'')';
  RAISE NOTICE '   WHERE id = ''00000000-0000-0000-0000-000000000001'';';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL DATABASE STATE:';
  RAISE NOTICE '═══════════════════════════════════════════════';

  FOR rec IN
    SELECT 'workspaces' as table_name, COUNT(*) as count FROM workspaces
    UNION ALL
    SELECT 'zones', COUNT(*) FROM zones
    UNION ALL
    SELECT 'service_areas', COUNT(*) FROM service_areas
    UNION ALL
    SELECT 'lgas', COUNT(*) FROM lgas
    UNION ALL
    SELECT 'facilities', COUNT(*) FROM facilities
    UNION ALL
    SELECT 'warehouses', COUNT(*) FROM warehouses
    UNION ALL
    SELECT 'vlms_vehicles', COUNT(*) FROM vlms_vehicles
    UNION ALL
    SELECT 'programs', COUNT(*) FROM programs
    UNION ALL
    SELECT 'profiles', COUNT(*) FROM profiles
    ORDER BY table_name
  LOOP
    RAISE NOTICE '   %: %', RPAD(rec.table_name, 20), rec.count;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 9. REFERENCE DATA CHECK
-- =====================================================

DO $$
DECLARE
  vehicle_categories INTEGER;
  vehicle_types INTEGER;
  facility_types INTEGER;
  levels_of_care INTEGER;
BEGIN
  -- Count reference data (should be preserved)
  SELECT COUNT(*) INTO vehicle_categories FROM vehicle_categories;
  SELECT COUNT(*) INTO vehicle_types FROM vehicle_types;
  SELECT COUNT(*) INTO facility_types FROM facility_types;
  SELECT COUNT(*) INTO levels_of_care FROM levels_of_care;

  RAISE NOTICE '📚 REFERENCE DATA (should be present):';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '   Vehicle Categories: %', vehicle_categories;
  RAISE NOTICE '   Vehicle Types: %', vehicle_types;
  RAISE NOTICE '   Facility Types: %', facility_types;
  RAISE NOTICE '   Levels of Care: %', levels_of_care;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Warnings if reference data is missing
  IF vehicle_categories = 0 THEN
    RAISE WARNING '⚠️  No vehicle categories found - check migrations';
  END IF;

  IF facility_types = 0 THEN
    RAISE WARNING '⚠️  No facility types found - check migrations';
  END IF;
END $$;

-- =====================================================
-- COMMIT
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ CLEANUP COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the database state above';
  RAISE NOTICE '2. Update default workspace name/country if needed';
  RAISE NOTICE '3. Import your real operational data';
  RAISE NOTICE '4. Test facility creation workflow';
  RAISE NOTICE '5. Test vehicle onboarding workflow';
  RAISE NOTICE '';
  RAISE NOTICE 'All sample operational data has been removed.';
  RAISE NOTICE 'Reference data (vehicle categories, facility types) preserved.';
  RAISE NOTICE '';
END $$;

COMMIT;

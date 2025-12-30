-- ============================================================================
-- PHASE 0 BLOCK 5: VLMS Foreign Key Migration
-- ============================================================================
-- Migrates all VLMS child tables to reference 'vehicles' instead of 'vlms_vehicles'
-- This completes the vehicle table unification started in migration 20251129000003
-- ============================================================================

-- ============================================================================
-- 1. PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
  v_orphaned_fuel_logs INTEGER;
  v_orphaned_maintenance INTEGER;
  v_orphaned_incidents INTEGER;
  v_orphaned_assignments INTEGER;
  v_orphaned_inspections INTEGER;
  v_orphaned_disposal INTEGER;
BEGIN
  -- Check for orphaned records in vlms_fuel_logs
  SELECT COUNT(*) INTO v_orphaned_fuel_logs
  FROM vlms_fuel_logs fl
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = fl.vehicle_id);

  -- Check for orphaned records in vlms_maintenance_records
  SELECT COUNT(*) INTO v_orphaned_maintenance
  FROM vlms_maintenance_records mr
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = mr.vehicle_id);

  -- Check for orphaned records in vlms_incidents
  SELECT COUNT(*) INTO v_orphaned_incidents
  FROM vlms_incidents i
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = i.vehicle_id);

  -- Check for orphaned records in vlms_assignments
  SELECT COUNT(*) INTO v_orphaned_assignments
  FROM vlms_assignments a
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = a.vehicle_id);

  -- Check for orphaned records in vlms_inspections
  SELECT COUNT(*) INTO v_orphaned_inspections
  FROM vlms_inspections i
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = i.vehicle_id);

  -- Check for orphaned records in vlms_disposal_records
  SELECT COUNT(*) INTO v_orphaned_disposal
  FROM vlms_disposal_records d
  WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = d.vehicle_id);

  -- Report findings
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VLMS FK Migration - Pre-Migration Validation';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Orphaned fuel_logs: %', v_orphaned_fuel_logs;
  RAISE NOTICE 'Orphaned maintenance_records: %', v_orphaned_maintenance;
  RAISE NOTICE 'Orphaned incidents: %', v_orphaned_incidents;
  RAISE NOTICE 'Orphaned assignments: %', v_orphaned_assignments;
  RAISE NOTICE 'Orphaned inspections: %', v_orphaned_inspections;
  RAISE NOTICE 'Orphaned disposal_records: %', v_orphaned_disposal;
  RAISE NOTICE '';

  -- Abort if orphaned records found
  IF v_orphaned_fuel_logs > 0 OR v_orphaned_maintenance > 0 OR v_orphaned_incidents > 0 OR
     v_orphaned_assignments > 0 OR v_orphaned_inspections > 0 OR v_orphaned_disposal > 0 THEN
    RAISE EXCEPTION 'Migration aborted: Found orphaned records. Run data sync first.';
  END IF;

  RAISE NOTICE 'All validation checks passed. Proceeding with FK migration...';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 2. UPDATE VLMS_FUEL_LOGS FK
-- ============================================================================

ALTER TABLE vlms_fuel_logs DROP CONSTRAINT IF EXISTS vlms_fuel_logs_vehicle_id_fkey;
ALTER TABLE vlms_fuel_logs ADD CONSTRAINT vlms_fuel_logs_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. UPDATE VLMS_MAINTENANCE_RECORDS FK
-- ============================================================================

ALTER TABLE vlms_maintenance_records DROP CONSTRAINT IF EXISTS vlms_maintenance_records_vehicle_id_fkey;
ALTER TABLE vlms_maintenance_records ADD CONSTRAINT vlms_maintenance_records_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 4. UPDATE VLMS_INCIDENTS FK
-- ============================================================================

ALTER TABLE vlms_incidents DROP CONSTRAINT IF EXISTS vlms_incidents_vehicle_id_fkey;
ALTER TABLE vlms_incidents ADD CONSTRAINT vlms_incidents_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. UPDATE VLMS_ASSIGNMENTS FK
-- ============================================================================

ALTER TABLE vlms_assignments DROP CONSTRAINT IF EXISTS vlms_assignments_vehicle_id_fkey;
ALTER TABLE vlms_assignments ADD CONSTRAINT vlms_assignments_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 6. UPDATE VLMS_INSPECTIONS FK
-- ============================================================================

ALTER TABLE vlms_inspections DROP CONSTRAINT IF EXISTS vlms_inspections_vehicle_id_fkey;
ALTER TABLE vlms_inspections ADD CONSTRAINT vlms_inspections_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 7. UPDATE VLMS_DISPOSAL_RECORDS FK
-- ============================================================================

ALTER TABLE vlms_disposal_records DROP CONSTRAINT IF EXISTS vlms_disposal_records_vehicle_id_fkey;
ALTER TABLE vlms_disposal_records ADD CONSTRAINT vlms_disposal_records_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- ============================================================================
-- 8. UPDATE VEHICLE_TIERS FK (if exists)
-- ============================================================================

DO $$
BEGIN
  -- Check if vehicle_tiers table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_tiers') THEN
    ALTER TABLE vehicle_tiers DROP CONSTRAINT IF EXISTS vehicle_tiers_vehicle_id_fkey;
    ALTER TABLE vehicle_tiers ADD CONSTRAINT vehicle_tiers_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Updated vehicle_tiers FK';
  ELSE
    RAISE NOTICE 'vehicle_tiers table not found, skipping';
  END IF;
END $$;

-- ============================================================================
-- 9. POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_fk_count INTEGER;
  v_vlms_fks RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VLMS FK Migration - Post-Migration Verification';
  RAISE NOTICE '=================================================================';

  -- Count total VLMS FKs now pointing to vehicles
  SELECT COUNT(*) INTO v_fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid::regclass::text LIKE 'vlms_%'
    AND confrelid::regclass = 'vehicles'::regclass;

  RAISE NOTICE 'Total VLMS FKs pointing to vehicles: %', v_fk_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Detailed FK Relationships:';

  -- List all VLMS foreign keys
  FOR v_vlms_fks IN
    SELECT
      conrelid::regclass AS table_name,
      conname AS constraint_name,
      confrelid::regclass AS referenced_table
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid::regclass::text LIKE 'vlms_%'
    ORDER BY table_name
  LOOP
    RAISE NOTICE '  % -> % (%)',
      v_vlms_fks.table_name,
      v_vlms_fks.referenced_table,
      v_vlms_fks.constraint_name;
  END LOOP;

  RAISE NOTICE '';

  -- Check for any remaining FKs to vlms_vehicles
  SELECT COUNT(*) INTO v_fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND confrelid::regclass = 'vlms_vehicles'::regclass;

  IF v_fk_count > 0 THEN
    RAISE WARNING 'WARNING: % foreign keys still reference vlms_vehicles', v_fk_count;
  ELSE
    RAISE NOTICE 'SUCCESS: No foreign keys reference vlms_vehicles';
  END IF;

  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 10. ADD MIGRATION METADATA
-- ============================================================================

COMMENT ON CONSTRAINT vlms_fuel_logs_vehicle_id_fkey ON vlms_fuel_logs IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

COMMENT ON CONSTRAINT vlms_maintenance_records_vehicle_id_fkey ON vlms_maintenance_records IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

COMMENT ON CONSTRAINT vlms_incidents_vehicle_id_fkey ON vlms_incidents IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

COMMENT ON CONSTRAINT vlms_assignments_vehicle_id_fkey ON vlms_assignments IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

COMMENT ON CONSTRAINT vlms_inspections_vehicle_id_fkey ON vlms_inspections IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

COMMENT ON CONSTRAINT vlms_disposal_records_vehicle_id_fkey ON vlms_disposal_records IS
  'Updated to reference vehicles table (Phase 0 Block 5 - 2025-12-29)';

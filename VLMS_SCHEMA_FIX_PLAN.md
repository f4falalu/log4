# VLMS Schema Unification Plan
## Phase 0 Block 5: VLMS Foreign Key Migration

**Status**: PLANNED (Not Yet Started)  
**Priority**: HIGH - Blocking VLMS functionality  
**Estimated Time**: 2-3 hours  
**Dependencies**: Phase 0 Blocks 1-4 complete ✅

---

## Problem Statement

The VLMS system is **broken** due to a **foreign key mismatch** between database schema and frontend queries.

### The Conflict

**Database Reality (Foreign Keys)**:
```sql
vlms_fuel_logs.vehicle_id → vlms_vehicles(id)
vlms_maintenance_records.vehicle_id → vlms_vehicles(id)
vlms_incidents.vehicle_id → vlms_vehicles(id)
vlms_assignments.vehicle_id → vlms_vehicles(id)
```

**Frontend Expectations (Queries)**:
```typescript
// All VLMS stores try to join with 'vehicles' table
vehicle:vehicles(id, vehicle_id, make, model, license_plate)
```

### The Error

```
Failed to fetch fuel logs: Could not find a relationship between 'vlms_fuel_logs' and 'vehicles' in the schema cache
```

**Root Cause**: The frontend queries expect FKs to the `vehicles` table, but all VLMS child tables have FKs to the old `vlms_vehicles` table.

---

## Investigation Summary

### What Exists

1. **Two Vehicle Tables**:
   - `vlms_vehicles` - Original VLMS table (10,000+ rows)
   - `vehicles` - New unified canonical table

2. **VLMS Child Tables** (6 tables):
   - `vlms_fuel_logs`
   - `vlms_maintenance_records`
   - `vlms_incidents`
   - `vlms_assignments`
   - `vlms_inspections`
   - `vlms_disposal_records`
   - **All have FKs to `vlms_vehicles.id`**

3. **Incomplete Migration**:
   - Migration `20251129000003_backfill_vlms_to_vehicles.sql` copied data from `vlms_vehicles` → `vehicles` (one-time)
   - Migration `20251129000004_create_vehicles_unified_view.sql` created bridge view
   - **BUT**: VLMS child table FKs were NEVER updated
   - **Result**: Frontend and database are misaligned

4. **Frontend Stores** (6 stores):
   - `fuelLogsStore.ts` - Queries `vlms_fuel_logs` joined with `vehicles`
   - `maintenanceStore.ts` - Queries `vlms_maintenance_records` joined with `vehicles`
   - `incidentsStore.ts` - Queries `vlms_incidents` joined with `vehicles`
   - `assignmentsStore.ts` - Queries `vlms_assignments` joined with `vehicles`
   - All expect `vehicles` table relationships

5. **Feature Flag**:
   - `VITE_VEHICLE_CONSOLIDATION` flag exists but is **DISABLED** by default
   - When enabled, `vehiclesStore` uses `vehicles_unified_v` view
   - **BUT**: VLMS stores don't use feature flag, always query with `vehicles`

---

## Solution: Option A - Complete the Migration (Recommended)

**Goal**: Make `vehicles` the single source of truth, update all VLMS FKs to reference it.

### Migration Strategy

**Phase 1**: Update Foreign Keys (Database)  
**Phase 2**: Update Frontend Queries (Code)  
**Phase 3**: Deprecate Old Table  
**Phase 4**: Enable Feature Flag  

---

## Implementation Plan

### **BLOCK 5A: Database FK Migration**

#### Migration File: `20251229000003_vlms_foreign_key_migration.sql`

**Steps**:

1. **Verify data consistency** (safety check):
   ```sql
   -- Ensure all vlms_fuel_logs.vehicle_id exists in vehicles
   SELECT COUNT(*) FROM vlms_fuel_logs fl
   WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.id = fl.vehicle_id);
   -- Should return 0
   ```

2. **Update vlms_fuel_logs FK**:
   ```sql
   ALTER TABLE vlms_fuel_logs DROP CONSTRAINT IF EXISTS vlms_fuel_logs_vehicle_id_fkey;
   ALTER TABLE vlms_fuel_logs ADD CONSTRAINT vlms_fuel_logs_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

3. **Update vlms_maintenance_records FK**:
   ```sql
   ALTER TABLE vlms_maintenance_records DROP CONSTRAINT IF EXISTS vlms_maintenance_records_vehicle_id_fkey;
   ALTER TABLE vlms_maintenance_records ADD CONSTRAINT vlms_maintenance_records_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

4. **Update vlms_incidents FK**:
   ```sql
   ALTER TABLE vlms_incidents DROP CONSTRAINT IF EXISTS vlms_incidents_vehicle_id_fkey;
   ALTER TABLE vlms_incidents ADD CONSTRAINT vlms_incidents_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

5. **Update vlms_assignments FK**:
   ```sql
   ALTER TABLE vlms_assignments DROP CONSTRAINT IF EXISTS vlms_assignments_vehicle_id_fkey;
   ALTER TABLE vlms_assignments ADD CONSTRAINT vlms_assignments_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

6. **Update vlms_inspections FK**:
   ```sql
   ALTER TABLE vlms_inspections DROP CONSTRAINT IF EXISTS vlms_inspections_vehicle_id_fkey;
   ALTER TABLE vlms_inspections ADD CONSTRAINT vlms_inspections_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

7. **Update vlms_disposal_records FK**:
   ```sql
   ALTER TABLE vlms_disposal_records DROP CONSTRAINT IF EXISTS vlms_disposal_records_vehicle_id_fkey;
   ALTER TABLE vlms_disposal_records ADD CONSTRAINT vlms_disposal_records_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

8. **Update vehicle_tiers FK** (if exists):
   ```sql
   ALTER TABLE vehicle_tiers DROP CONSTRAINT IF EXISTS vehicle_tiers_vehicle_id_fkey;
   ALTER TABLE vehicle_tiers ADD CONSTRAINT vehicle_tiers_vehicle_id_fkey
     FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
   ```

9. **Verification**:
   ```sql
   -- Confirm all FKs now point to vehicles
   SELECT 
     conrelid::regclass AS table_name,
     conname AS constraint_name,
     confrelid::regclass AS referenced_table
   FROM pg_constraint
   WHERE contype = 'f'
     AND conrelid::regclass::text LIKE 'vlms_%'
     AND confrelid::regclass::text IN ('vehicles', 'vlms_vehicles')
   ORDER BY table_name;
   ```

**Rollback Plan**:
```sql
-- If migration fails, revert all FKs back to vlms_vehicles
ALTER TABLE vlms_fuel_logs DROP CONSTRAINT vlms_fuel_logs_vehicle_id_fkey;
ALTER TABLE vlms_fuel_logs ADD CONSTRAINT vlms_fuel_logs_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vlms_vehicles(id) ON DELETE CASCADE;
-- Repeat for all tables
```

---

### **BLOCK 5B: Frontend Query Updates** (Optional Cleanup)

**Current State**: Frontend queries work WITHOUT specifying FK constraint names.

**Files to Review** (may not need changes):
- `src/stores/vlms/fuelLogsStore.ts`
- `src/stores/vlms/maintenanceStore.ts`
- `src/stores/vlms/incidentsStore.ts`
- `src/stores/vlms/assignmentsStore.ts`

**Change Pattern** (if needed):
```typescript
// BEFORE (may fail with constraint name):
.select(`
  *,
  vehicle:vehicles!vlms_fuel_logs_vehicle_id_fkey(
    id, vehicle_id, make, model, license_plate
  )
`)

// AFTER (Supabase infers FK):
.select(`
  *,
  vehicle:vehicles(
    id, vehicle_id, make, model, license_plate
  )
`)
```

**Likely**: Queries already use implicit joins, so no code changes needed after FK migration.

---

### **BLOCK 5C: Deprecate vlms_vehicles Table**

**After validation**:

1. **Rename table**:
   ```sql
   ALTER TABLE vlms_vehicles RENAME TO vlms_vehicles_deprecated;
   ```

2. **Drop old triggers**:
   ```sql
   DROP TRIGGER IF EXISTS trigger_auto_sync_vehicle_tiers ON vlms_vehicles_deprecated;
   DROP TRIGGER IF EXISTS update_vlms_vehicles_updated_at ON vlms_vehicles_deprecated;
   ```

3. **Add deprecation notice**:
   ```sql
   COMMENT ON TABLE vlms_vehicles_deprecated IS 
     'DEPRECATED: This table has been replaced by the vehicles table. 
      All VLMS foreign keys now reference vehicles. 
      This table is retained for historical backup only.';
   ```

4. **Create backup**:
   ```sql
   -- Create archive schema
   CREATE SCHEMA IF NOT EXISTS archived;
   
   -- Move deprecated table
   ALTER TABLE vlms_vehicles_deprecated SET SCHEMA archived;
   ```

---

### **BLOCK 5D: Enable Feature Flag**

**File**: `.env` or `.env.local`

```bash
# Enable vehicle consolidation
VITE_VEHICLE_CONSOLIDATION=true
```

**Code**: Already implemented in `src/stores/vlms/vehiclesStore.ts`:
```typescript
const tableName = getVehiclesTableName(); // Returns 'vehicles' or 'vehicles_unified_v'
```

**Verification**:
- All VLMS pages load without errors
- Fuel logs, maintenance, incidents, assignments display vehicle data
- Joins between VLMS tables and vehicles work correctly

---

## Execution Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Run data consistency checks
- [ ] Verify all `vlms_fuel_logs.vehicle_id` exist in `vehicles` table
- [ ] Document current FK constraints (for rollback)

### Migration Execution
- [ ] Apply FK migration SQL (20251229000003_vlms_foreign_key_migration.sql)
- [ ] Verify FK constraints updated (run verification query)
- [ ] Test VLMS queries in Supabase SQL Editor
- [ ] Regenerate TypeScript types: `npx supabase gen types typescript --linked > src/types/supabase.ts`

### Post-Migration Validation
- [ ] Navigate to `/fleetops/vlms/fuel` - No errors, fuel logs display
- [ ] Navigate to `/fleetops/vlms/maintenance` - Maintenance records display
- [ ] Navigate to `/fleetops/vlms/incidents` - Incidents display
- [ ] Navigate to `/fleetops/vlms/assignments` - Assignments display
- [ ] Check browser console - No FK relationship errors
- [ ] Verify joins return vehicle details (make, model, license plate)

### Feature Flag Enablement
- [ ] Set `VITE_VEHICLE_CONSOLIDATION=true` in `.env`
- [ ] Restart dev server
- [ ] Verify `/fleetops/vlms/vehicles` uses `vehicles` table
- [ ] Confirm vehicle counts match between old/new queries

### Cleanup
- [ ] Rename `vlms_vehicles` → `vlms_vehicles_deprecated`
- [ ] Drop old triggers
- [ ] Add deprecation comment
- [ ] Move to archived schema
- [ ] Update documentation

---

## Risk Assessment

### **Low Risk**:
- FK migration is atomic (either all succeed or all rollback)
- Data already synced (migration 20251129000003 ran previously)
- Frontend queries don't specify FK constraint names (will work with any FK)

### **Medium Risk**:
- If `vehicles` table is missing records that `vlms_*` tables reference, FK creation will fail
- **Mitigation**: Run data consistency checks first

### **Rollback**:
- Simple: Revert all FKs back to `vlms_vehicles`
- No data loss risk

---

## Success Criteria

✅ All VLMS child tables have FKs to `vehicles` table  
✅ VLMS pages load without "relationship not found" errors  
✅ Fuel logs, maintenance, incidents, assignments display vehicle details  
✅ Feature flag enabled, `vehicles` is canonical table  
✅ `vlms_vehicles` deprecated and archived  
✅ TypeScript types regenerated  
✅ Build successful  

---

## Alignment with Current Recovery Plan

This plan fits into the **Phase 0: Critical Fixes** track:

### Already Complete (Today):
- ✅ **Block 1**: Routing Restoration (13 routes added)
- ✅ **Block 2**: Database Deployment (workspace_members, planning_system, storage_buckets)
- ✅ **Block 3**: Analytics Architecture (zero client-side aggregation)
- ✅ **Block 4**: Runtime Dependencies (@dnd-kit)
- ✅ **Runtime Fixes**: Map System errors (setCapability, MapHUD)

### Next Up:
- ⏳ **Block 5**: VLMS Schema Unification (THIS PLAN)
  - 5A: Database FK Migration (30 min)
  - 5B: Frontend Query Updates (15 min, if needed)
  - 5C: Deprecate vlms_vehicles (15 min)
  - 5D: Enable Feature Flag (5 min)
  - **Total**: ~1 hour

### After Block 5:
- Continue with **Phase 1 Deferred Work** (TypeScript strict mode, console cleanup, etc.)
- OR address other critical issues as they arise

---

## Files to Create/Modify

### New Migration:
- `supabase/migrations/20251229000003_vlms_foreign_key_migration.sql` (NEW)

### Configuration:
- `.env` or `.env.local` (MODIFY - add `VITE_VEHICLE_CONSOLIDATION=true`)

### TypeScript Types:
- `src/types/supabase.ts` (REGENERATE after migration)

### Possible Code Updates (if needed):
- `src/stores/vlms/fuelLogsStore.ts` (VERIFY - likely no changes)
- `src/stores/vlms/maintenanceStore.ts` (VERIFY - likely no changes)
- `src/stores/vlms/incidentsStore.ts` (VERIFY - likely no changes)
- `src/stores/vlms/assignmentsStore.ts` (VERIFY - likely no changes)

**Total New Files**: 1 migration  
**Total Modified Files**: 1 config + 1 types regeneration  
**Estimated LOC**: ~150 lines SQL + 1 line config  

---

## Next Steps

**Option 1**: Execute Block 5 now (fix VLMS immediately)  
**Option 2**: Commit current work first, then tackle Block 5  
**Option 3**: Continue with other priorities, defer Block 5  

**Recommendation**: Execute Block 5 after committing current work. VLMS is a major subsystem (10,000+ LOC) and fixing it completes the foundational restoration work.

---

**Plan Status**: READY FOR EXECUTION  
**Approval Required**: YES - User confirmation to proceed  
**Estimated Completion**: 1 hour from start  

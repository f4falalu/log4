# Vehicle Consolidation Implementation Roadmap

**Status**: 📅 Execution Plan
**Created**: 2025-11-18
**Total Estimated Time**: 12-16 hours
**Target Completion**: 5 business days

---

## Timeline Overview

```
Day 1 (4 hours)  │ Phase 1 Migration + Phase 2 Sync
Day 2 (3 hours)  │ Phase 3-4 Helpers + Testing
Day 3 (3 hours)  │ Code Updates + Integration Tests
Day 4 (2 hours)  │ Phase 5 Data Migration
Day 5 (2 hours)  │ Documentation + Handoff
```

---

## Phase 1: Foundation (Day 1 Morning - 2 hours)

### 1.1 Pre-Flight Checks (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Backup production database
- [ ] Verify backup integrity
- [ ] Create restore point snapshot
- [ ] Document current row counts

**Commands**:
```bash
# Backup via Supabase CLI
npx supabase db dump -f backup_pre_consolidation_$(date +%Y%m%d).sql

# Verify vehicles table
psql -c "SELECT COUNT(*) FROM vehicles;"
```

**Deliverable**: Backup confirmation + baseline metrics

---

### 1.2 Apply Phase 1 Migration (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Review `20251118000010_add_missing_vehicle_columns.sql`
- [ ] Apply to staging database first
- [ ] Verify column additions (32 columns)
- [ ] Apply to production database
- [ ] Verify no errors

**Execution**:
```bash
# Staging test
npx supabase db push --db-url <staging-url>

# Production (after staging verification)
npx supabase db push
```

**Verification**:
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'vehicles' AND column_name IN (
  'make', 'year', 'vin', 'acquisition_date', 'acquisition_type'
);
-- Expected: 32 (all new columns)
```

**Rollback Procedure**: See [consolidation_proposal.md](#rollback-strategy) Phase 1

---

### 1.3 Regenerate TypeScript Types (15 min)
**Owner**: Frontend Developer
**Status**: ⏳ Pending

**Tasks**:
- [ ] Run type generation command
- [ ] Verify new fields in types
- [ ] Commit updated types.ts file
- [ ] Push to feature branch

**Commands**:
```bash
cd /Users/fbarde/Documents/log4/log4
npx supabase gen types typescript --project-id cenugzabuzglswikoewy > src/integrations/supabase/types.ts
git add src/integrations/supabase/types.ts
git commit -m "chore: regenerate types after vehicle schema update"
```

**Verification**: Check that `vehicles` table Row type includes `make`, `year`, etc.

---

### 1.4 Test VLMS Onboarding (15 min)
**Owner**: QA / Developer
**Status**: ⏳ Pending

**Tasks**:
- [ ] Restart dev server (`npm run dev`)
- [ ] Navigate to `/fleetops/vlms/vehicles/onboard`
- [ ] Complete onboarding wizard
- [ ] Verify successful vehicle creation
- [ ] Check database record

**Expected Result**: Vehicle created with all VLMS fields populated

**If Test Fails**: See [risk_assessment.md](#mitigation-strategies)

---

## Phase 2: Dual Column Sync (Day 1 Afternoon - 2 hours)

### 2.1 Apply Phase 2 Migration (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Review `20251118000011_add_license_plate_sync.sql`
- [ ] Apply to staging
- [ ] Test bidirectional sync
- [ ] Apply to production

**Execution**:
```bash
npx supabase db push
```

**Verification**:
```sql
-- Test insert
INSERT INTO vehicles (model, plate_number, type, capacity, max_weight, fuel_type, fuel_efficiency, status)
VALUES ('Test', 'TEST-SYNC', 'van', 10, 1000, 'diesel', 12.5, 'available');

-- Verify sync
SELECT plate_number, license_plate FROM vehicles WHERE plate_number = 'TEST-SYNC';
-- Expected: TEST-SYNC | TEST-SYNC

-- Cleanup
DELETE FROM vehicles WHERE plate_number = 'TEST-SYNC';
```

---

### 2.2 Update VLMS Stores (1 hour)
**Owner**: Frontend Developer
**Status**: ⏳ Pending

**Files to Update**:
1. `/src/stores/vlms/vehiclesStore.ts` (Line 86)
2. `/src/stores/vlms/maintenanceStore.ts` (Lines 75, 138)
3. `/src/stores/vlms/assignmentsStore.ts` (Line 40)
4. `/src/stores/vlms/incidentsStore.ts` (Line 40)

**Change Pattern**:
```typescript
// BEFORE (all stores):
vehicle:vehicles(id, vehicle_id, make, model, license_plate, ...)

// AFTER:
vehicle:vehicles(id, vehicle_id, make, model, license_plate, ...)
// No change needed after Phase 2! Column now exists.
```

**If Phase 2 not yet deployed**, temporarily use:
```typescript
vehicle:vehicles(id, vehicle_id, make, model, plate_number, ...)
```

**Commit**:
```bash
git add src/stores/vlms/*.ts
git commit -m "fix: update VLMS stores to use license_plate column"
```

---

### 2.3 Integration Test (30 min)
**Owner**: QA
**Status**: ⏳ Pending

**Test Scenarios**:
1. **Create vehicle via VLMS onboarding**
   - Verify `license_plate` populated
   - Verify `plate_number` synced

2. **Create vehicle via production quick-add**
   - Enter `plate_number`
   - Verify `license_plate` synced

3. **Update plate number**
   - Update `plate_number` via production UI
   - Verify `license_plate` updated
   - Update `license_plate` via VLMS UI
   - Verify `plate_number` updated

**Pass Criteria**: All 3 scenarios work without errors

---

## Phase 3: Auto-Generation (Day 2 Morning - 1.5 hours)

### 3.1 Apply Phase 3 Migration (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Review `20251118000012_add_vehicle_id_generation.sql`
- [ ] Apply to staging
- [ ] Test auto-generation
- [ ] Apply to production

**Verification**:
```sql
INSERT INTO vehicles (model, plate_number, type, capacity, max_weight, fuel_type, fuel_efficiency, status)
VALUES ('Auto ID Test', 'AUTO-001', 'van', 10, 1000, 'diesel', 12.5, 'available')
RETURNING vehicle_id;
-- Expected: VEH-2025-001 (or next in sequence)
```

---

### 3.2 Test Auto-Generation (30 min)
**Owner**: QA
**Status**: ⏳ Pending

**Test Scenarios**:
1. Create 3 vehicles via onboarding wizard
2. Verify sequential IDs: VEH-2025-001, VEH-2025-002, VEH-2025-003
3. Create vehicle with explicit `vehicle_id`
4. Verify custom ID not overwritten

---

## Phase 4: Helper Functions (Day 2 Afternoon - 1.5 hours)

### 4.1 Apply Phase 4 Migration (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Review `20251118000013_add_vehicle_helpers.sql`
- [ ] Apply to staging
- [ ] Test triggers
- [ ] Apply to production

**Verification**:
```sql
-- Test 1: Capacity sync
INSERT INTO vehicles (
  model, plate_number, type, capacity_m3, capacity_kg,
  fuel_type, fuel_efficiency, status
) VALUES (
  'Capacity Test', 'CAP-001', 'van', 15.5, 2000,
  'diesel', 12.5, 'available'
);

SELECT capacity, max_weight, capacity_m3, capacity_kg
FROM vehicles WHERE plate_number = 'CAP-001';
-- Expected: 15.5 | 2000 | 15.5 | 2000

-- Test 2: Audit trail
SELECT created_by, updated_by FROM vehicles WHERE plate_number = 'CAP-001';
-- Expected: <current_user_id> | NULL

UPDATE vehicles SET model = 'Updated' WHERE plate_number = 'CAP-001';
SELECT updated_by FROM vehicles WHERE plate_number = 'CAP-001';
-- Expected: <current_user_id>
```

---

### 4.2 Update Documentation (1 hour)
**Owner**: Technical Writer / Developer
**Status**: ⏳ Pending

**Tasks**:
- [ ] Document new schema in codebase README
- [ ] Update API documentation
- [ ] Create field mapping guide
- [ ] Document capacity model (legacy vs VLMS)

**Deliverable**: Updated docs in `/docs/vehicle-schema.md`

---

## Phase 5: Data Migration (Day 4 - 2 hours)

### 5.1 Pre-Migration Checks (30 min)
**Owner**: Database Admin
**Status**: ⏳ Pending

**Tasks**:
- [ ] Take full database backup
- [ ] Count existing vehicles
- [ ] Identify records missing acquisition_date
- [ ] Review migration script

**Queries**:
```sql
SELECT COUNT(*) FROM vehicles;
SELECT COUNT(*) FROM vehicles WHERE acquisition_date IS NULL;
SELECT COUNT(*) FROM vehicles WHERE vehicle_id IS NULL;
```

---

### 5.2 Apply Phase 5 Migration (1 hour)
**Owner**: Database Admin
**Status**: ⏳ Pending

**⚠️ CRITICAL**: Review with stakeholders before running

**Tasks**:
- [ ] Run on staging database first
- [ ] Verify results on staging
- [ ] Schedule maintenance window (if needed)
- [ ] Apply to production
- [ ] Verify row counts match

**Execution**:
```bash
# Apply migration
npx supabase db push

# Verify
psql -c "SELECT COUNT(*) FROM vehicles WHERE vehicle_id IS NOT NULL;"
psql -c "SELECT COUNT(*) FROM vehicles WHERE acquisition_date IS NOT NULL;"
```

---

### 5.3 Post-Migration Validation (30 min)
**Owner**: QA + Database Admin
**Status**: ⏳ Pending

**Validation Queries**:
```sql
-- Check 1: All vehicles have vehicle_id
SELECT COUNT(*) FROM vehicles WHERE vehicle_id IS NULL;
-- Expected: 0

-- Check 2: All vehicles have acquisition_date
SELECT COUNT(*) FROM vehicles WHERE acquisition_date IS NULL;
-- Expected: 0

-- Check 3: Plate sync working
SELECT COUNT(*) FROM vehicles WHERE plate_number != license_plate;
-- Expected: 0

-- Check 4: Sample data inspection
SELECT id, vehicle_id, make, model, year, license_plate, acquisition_date
FROM vehicles LIMIT 10;
```

**If Issues Found**: Execute rollback immediately (see Phase 5 rollback)

---

## Phase 6: Code Consolidation (Day 3 - 3 hours)

### 6.1 Merge Duplicate Components (2 hours)
**Owner**: Frontend Developer
**Status**: ⏳ Pending

**Tasks**:
- [ ] Archive `/src/pages/VehicleManagement.tsx`
- [ ] Update routes to point to VLMS pages
- [ ] Test all navigation paths
- [ ] Remove old imports

**Files to Archive**:
- `/src/pages/VehicleManagement.tsx`
- `/src/pages/VehicleManagementPage.tsx`
- `/src/components/vehicle/VehicleTypeManager.tsx` (use VLMS version)

**Route Updates**:
```typescript
// Before:
{ path: '/vehicles', component: VehicleManagement }

// After:
{ path: '/vehicles', redirect: '/fleetops/vlms/vehicles' }
```

---

### 6.2 Update Production Hooks (1 hour)
**Owner**: Frontend Developer
**Status**: ⏳ Pending

**Files to Update**:
- `/src/hooks/useVehicles.tsx` (Line 30)
- `/src/hooks/useVehicleManagement.tsx` (Line 43-46)
- `/src/hooks/useAllDriverVehicles.tsx` (Line 45)

**Change Pattern**:
```typescript
// BEFORE:
plateNumber: v.plate_number || 'N/A'

// AFTER:
plateNumber: v.license_plate || v.plate_number || 'N/A'
// Fallback to plate_number for backward compat during transition
```

**Commit**:
```bash
git add src/hooks/*.tsx
git commit -m "refactor: update hooks to use license_plate field"
```

---

## Phase 7: Final Testing & Documentation (Day 5 - 2 hours)

### 7.1 End-to-End Testing (1 hour)
**Owner**: QA Team
**Status**: ⏳ Pending

**Test Suites**:

**Suite 1: VLMS Onboarding**
- [ ] Create vehicle with all fields
- [ ] Create vehicle with minimal fields
- [ ] Create vehicle with custom vehicle_id
- [ ] Verify all data saved correctly

**Suite 2: Production Quick Add**
- [ ] Create vehicle via legacy form
- [ ] Verify backward compatibility
- [ ] Check computed fields populated

**Suite 3: Vehicle Management**
- [ ] List all vehicles
- [ ] Filter by make, year, status
- [ ] Update vehicle details
- [ ] Delete vehicle

**Suite 4: Integrations**
- [ ] Assign vehicle to driver
- [ ] Create maintenance record
- [ ] Log fuel consumption
- [ ] Generate reports

**Pass Criteria**: All 4 suites pass with zero errors

---

### 7.2 Documentation Finalization (1 hour)
**Owner**: Technical Writer
**Status**: ⏳ Pending

**Documents to Create/Update**:
- [ ] Vehicle Schema Reference (`/docs/vehicle-schema.md`)
- [ ] Migration Change Log (`/docs/CHANGELOG.md`)
- [ ] API Field Mapping Guide
- [ ] Developer Onboarding Guide

**Template for Vehicle Schema Reference**:
```markdown
# Vehicle Schema Reference

## Field Definitions

### Identity Fields
- `id` (UUID): Primary key
- `vehicle_id` (VARCHAR): Auto-generated VEH-YYYY-NNN format

### Basic Information
- `make` (VARCHAR): Brand/manufacturer
- `model` (TEXT): Vehicle model
- `year` (INTEGER): Manufacturing year
...

## Field Migrations
- **Phase 1 (2025-11-18)**: Added 32 VLMS fields
- **Phase 2 (2025-11-18)**: Added license_plate sync
...
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All migrations tested on staging
- [ ] Backup procedures verified
- [ ] Rollback scripts prepared
- [ ] Code changes peer-reviewed
- [ ] Integration tests passing
- [ ] Stakeholder approval obtained

### Deployment Window
- [ ] Announce maintenance window (if needed)
- [ ] Take production backup
- [ ] Apply Phase 1-4 migrations
- [ ] Deploy code changes
- [ ] Run smoke tests
- [ ] Monitor error logs

### Post-Deployment
- [ ] Verify VLMS onboarding working
- [ ] Verify production vehicle management working
- [ ] Check for error spikes in logs
- [ ] Run validation queries
- [ ] Update status page

### Day-After Review
- [ ] Review application metrics
- [ ] Check database performance
- [ ] Collect user feedback
- [ ] Document lessons learned

---

## Risk Mitigation

### If VLMS Onboarding Fails After Phase 1
**Symptoms**: Insert errors, missing field errors

**Diagnosis**:
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vehicles' AND column_name = 'make';

-- Check TypeScript types regenerated
-- Open src/integrations/supabase/types.ts and search for 'make'
```

**Fix**: Regenerate types, restart dev server

---

### If Plate Sync Not Working After Phase 2
**Symptoms**: `license_plate` and `plate_number` diverge

**Diagnosis**:
```sql
SELECT plate_number, license_plate FROM vehicles
WHERE plate_number IS DISTINCT FROM license_plate;
```

**Fix**: Run manual sync
```sql
UPDATE vehicles SET license_plate = plate_number
WHERE license_plate IS DISTINCT FROM plate_number;
```

---

### If Data Migration Corrupts Records
**Symptoms**: NULL values, incorrect data

**Fix**: Immediate rollback
```sql
BEGIN;
TRUNCATE vehicles;
INSERT INTO vehicles SELECT * FROM vehicles_backup_20251118;
COMMIT;
```

---

## Success Metrics

**Technical Metrics**:
- ✅ Zero production errors post-deployment
- ✅ VLMS onboarding success rate: 100%
- ✅ Query performance maintained (< 5% degradation)
- ✅ All integration tests passing

**Business Metrics**:
- ✅ Vehicle data completeness: 95%+ (with VLMS fields)
- ✅ User adoption of VLMS onboarding: Target 80% within 2 weeks
- ✅ Data quality improved (VINs, acquisition dates populated)

**User Experience Metrics**:
- ✅ Zero user-reported onboarding failures
- ✅ Positive feedback on new vehicle detail pages
- ✅ Reduced support tickets for vehicle management

---

## Communication Plan

### Stakeholder Updates

**Day 1 Morning**: "Phase 1 complete - VLMS onboarding unblocked"
**Day 1 EOD**: "Phase 2 complete - Dual plate field sync working"
**Day 2 EOD**: "Phase 3-4 complete - Auto-generation and helpers added"
**Day 4 EOD**: "Phase 5 complete - Data migration successful"
**Day 5 EOD**: "Consolidation complete - System fully operational"

### Team Notifications

**Before Deployment**:
- Email to development team with migration timeline
- Slack notification of deployment window
- Update in daily standup

**During Deployment**:
- Real-time updates in #engineering Slack channel
- Status page updated if user-facing impact

**After Deployment**:
- Success confirmation email
- Knowledge base article published
- Demo session scheduled

---

## Appendix: Command Reference

### Supabase CLI Commands
```bash
# Backup database
npx supabase db dump -f backup.sql

# Apply migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts

# Reset database (staging only!)
npx supabase db reset
```

### PostgreSQL Commands
```bash
# Connect to database
psql <database-url>

# Run query
psql -c "SELECT COUNT(*) FROM vehicles;"

# Run script
psql -f migration.sql
```

### Git Commands
```bash
# Commit changes
git add .
git commit -m "feat: vehicle schema consolidation phase 1"

# Push to feature branch
git push origin feature/vehicle-consolidation-audit

# Create pull request
gh pr create --title "Vehicle Schema Consolidation" --body "See docs/audit/vehicle-consolidation/"
```

---

**Roadmap Status**: ✅ Ready for Execution
**Next Action**: Obtain stakeholder approval to begin Phase 1
**Point of Contact**: [Assign Owner]
**Escalation Path**: [Define escalation procedure]

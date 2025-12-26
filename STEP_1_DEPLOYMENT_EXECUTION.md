# STEP 1: DEPLOYMENT EXECUTION CHECKLIST

**Phase 1 Lock Sequence - Step 1 of 5**
**Estimated Time:** 30 minutes
**Date Started:** _____________

---

## Pre-Deployment Checklist

- [ ] Supabase Dashboard open: https://supabase.com/dashboard/project/cenugzabuzglswikoewy
- [ ] SQL Editor open: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new
- [ ] [DEPLOYMENT_CONFIRMATION_TEMPLATE.md](DEPLOYMENT_CONFIRMATION_TEMPLATE.md) ready for notes
- [ ] Backup plan reviewed (below)

**Start Time:** __________

---

## Migration Execution Sequence

### CRITICAL: Execute in Exact Order

Execute migrations 1-3 FIRST (Map System + Payloads - Phase 1 critical):

#### Migration 1: Trade-Off System ✅
**File:** `supabase/migrations/20251223000001_tradeoff_system.sql`

**Command:**
```bash
cat supabase/migrations/20251223000001_tradeoff_system.sql
```

**Actions:**
1. Copy entire file content
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Record results below:

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Duration:** __________ seconds
- **Status:** ⬜ PASS / ⬜ FAIL
- **Errors (if any):** ___________________________

**Creates:** 4 tables (tradeoffs, tradeoff_items, tradeoff_confirmations, tradeoff_routes)

---

#### Migration 2: Planning System ✅
**File:** `supabase/migrations/20251223000002_planning_system.sql`

**Command:**
```bash
cat supabase/migrations/20251223000002_planning_system.sql
```

**Actions:**
1. Copy entire file content
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Record results below:

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Duration:** __________ seconds
- **Status:** ⬜ PASS / ⬜ FAIL
- **Errors (if any):** ___________________________

**Creates:** 5 tables (zone_configurations, route_sketches, facility_assignments, map_action_audit, forensics_query_log)

---

#### Migration 3: Payloads Table ✅
**File:** `supabase/migrations/20251225000001_create_payloads_table.sql`

**Command:**
```bash
cat supabase/migrations/20251225000001_create_payloads_table.sql
```

**Actions:**
1. Copy entire file content
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Record results below:

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Duration:** __________ seconds
- **Status:** ⬜ PASS / ⬜ FAIL
- **Errors (if any):** ___________________________

**Creates:** 1 table (payloads) + 3 triggers + payload_items modifications

---

### ⚠️ OPTIONAL: Vehicle Consolidation (Can be deferred)

**Note:** These 5 migrations are for vehicle data consolidation. They are NOT critical for Phase 1 core functionality. You may:
- **Option A:** Deploy now (recommended for completeness)
- **Option B:** Defer to post-Phase 1 lock

#### Migration 4: Vehicle Canonical Columns
**File:** `supabase/migrations/20251129000001_add_canonical_vehicle_columns.sql`

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Status:** ⬜ PASS / ⬜ FAIL / ⬜ DEFERRED

---

#### Migration 5: Vehicle Merge Audit
**File:** `supabase/migrations/20251129000002_create_vehicle_merge_audit.sql`

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Status:** ⬜ PASS / ⬜ FAIL / ⬜ DEFERRED

---

#### Migration 6: Backfill VLMS to Vehicles
**File:** `supabase/migrations/20251129000003_backfill_vlms_to_vehicles.sql`

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Status:** ⬜ PASS / ⬜ FAIL / ⬜ DEFERRED

---

#### Migration 7: Vehicles Unified View
**File:** `supabase/migrations/20251129000004_create_vehicles_unified_view.sql`

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Status:** ⬜ PASS / ⬜ FAIL / ⬜ DEFERRED

---

#### Migration 8: Validation Queries
**File:** `supabase/migrations/20251129000005_validation_queries.sql`

- [ ] Execution successful
- **Start Time:** __________
- **End Time:** __________
- **Status:** ⬜ PASS / ⬜ FAIL / ⬜ DEFERRED

---

## Post-Deployment Verification

### Verification Query 1: Map System Tables

**Run in SQL Editor:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tradeoffs',
  'tradeoff_items',
  'tradeoff_confirmations',
  'tradeoff_routes',
  'zone_configurations',
  'route_sketches',
  'facility_assignments',
  'map_action_audit',
  'forensics_query_log'
)
ORDER BY table_name;
```

**Expected Result:** 9 rows

**Actual Result:**
```
(Paste output here)




```

- [ ] ✅ PASS (9 tables) / ⬜ FAIL

---

### Verification Query 2: RLS Policies

**Run in SQL Editor:**
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tradeoffs', 'zone_configurations', 'payloads')
GROUP BY tablename
ORDER BY tablename;
```

**Expected Result:** Each table should have multiple policies

**Actual Result:**
```
(Paste output here)




```

- [ ] ✅ PASS (policies exist) / ⬜ FAIL

---

### Verification Query 3: Payloads Table Triggers

**Run in SQL Editor:**
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'payloads'
ORDER BY trigger_name;
```

**Expected Result:** 3 triggers

**Actual Result:**
```
(Paste output here)




```

- [ ] ✅ PASS (3 triggers) / ⬜ FAIL

---

### Verification Query 4: Payload Items Schema Update

**Run in SQL Editor:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payload_items'
AND column_name IN ('payload_id', 'batch_id')
ORDER BY column_name;
```

**Expected Result:**
- payload_id | uuid | YES
- batch_id | uuid | YES (changed from NO)

**Actual Result:**
```
(Paste output here)




```

- [ ] ✅ PASS / ⬜ FAIL

---

### Verification Query 5: Database Functions

**Run in SQL Editor:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_workspace_tradeoffs',
  'activate_zone_configuration',
  'get_active_zones'
)
ORDER BY routine_name;
```

**Expected Result:** 3 functions

**Actual Result:**
```
(Paste output here)




```

- [ ] ✅ PASS (3 functions) / ⬜ FAIL

---

## Deployment Summary

**Total Migrations Executed:** _____ / 8

**Critical Migrations (Required):**
- [ ] Migration 1: Trade-Off System
- [ ] Migration 2: Planning System
- [ ] Migration 3: Payloads Table

**Optional Migrations (Deferred if needed):**
- [ ] Migrations 4-8: Vehicle Consolidation (5 migrations)

**Total Execution Time:** _____ minutes

**Overall Status:** ⬜ SUCCESS / ⬜ PARTIAL / ⬜ FAILED

---

## Issues Encountered

### Critical Issues (Blockers)

| Migration # | Error Message | Resolution |
|-------------|---------------|------------|
| | | |

⬜ **No critical issues**

---

### Non-Critical Issues

| Migration # | Warning/Issue | Action Taken |
|-------------|---------------|--------------|
| | | |

⬜ **No issues**

---

## Rollback Plan (If Needed)

**⚠️ ONLY USE IF CRITICAL ERRORS OCCURRED**

### Rollback Map System Tables:
```sql
DROP TABLE IF EXISTS forensics_query_log CASCADE;
DROP TABLE IF EXISTS map_action_audit CASCADE;
DROP TABLE IF EXISTS facility_assignments CASCADE;
DROP TABLE IF EXISTS route_sketches CASCADE;
DROP TABLE IF EXISTS zone_configurations CASCADE;
DROP TABLE IF EXISTS tradeoff_routes CASCADE;
DROP TABLE IF EXISTS tradeoff_confirmations CASCADE;
DROP TABLE IF EXISTS tradeoff_items CASCADE;
DROP TABLE IF EXISTS tradeoffs CASCADE;

DROP FUNCTION IF EXISTS get_workspace_tradeoffs(UUID);
DROP FUNCTION IF EXISTS activate_zone_configuration(UUID, UUID);
DROP FUNCTION IF EXISTS get_active_zones(UUID);
```

### Rollback Payloads Table:
```sql
DROP TABLE IF EXISTS payloads CASCADE;

-- Revert payload_items changes
ALTER TABLE payload_items DROP COLUMN IF EXISTS payload_id;
ALTER TABLE payload_items ALTER COLUMN batch_id SET NOT NULL;
```

**Rollback Executed:** ⬜ YES / ⬜ NO

**Reason:** _____________________________

---

## Next Steps After Successful Deployment

### Immediate (Today)

1. **Update [DEPLOYMENT_CONFIRMATION_TEMPLATE.md](DEPLOYMENT_CONFIRMATION_TEMPLATE.md)**
   - [ ] Fill in Section 1 (Migration Execution Status)
   - [ ] Fill in Section 2 (Verification Query Outputs)

2. **Environment Configuration**
   - [ ] Update `.env` with feature flags (optional - can defer)
   - [ ] Rebuild application: `npm run build` (optional - can defer)

3. **Notify Team**
   - [ ] Database migrations complete
   - [ ] Ready to proceed to Step 2 (UAT)

---

### Step 2: UAT Preparation (Next 1-2 days)

1. **Create Test User Accounts**
   - [ ] Create 5 test accounts (one per role)
   - [ ] Assign roles using `/admin/users` page
   - [ ] Document credentials securely

2. **Prepare UAT Team**
   - [ ] Assign UAT testers to roles
   - [ ] Share [DEPLOYMENT_CONFIRMATION_TEMPLATE.md](DEPLOYMENT_CONFIRMATION_TEMPLATE.md) Section 3
   - [ ] Schedule UAT execution

3. **UAT Execution**
   - [ ] Execute test matrices per role
   - [ ] Collect sign-offs
   - [ ] Document issues

---

## Deployment Sign-Off

**Database Deployment Completed By:** _____________

**Date:** _____________

**Time:** _____________

**Signature:** _____________

---

**Status:** ⬜ Step 1 COMPLETE - Proceed to Step 2 (UAT)

**Critical Migrations (3/3):** ⬜ ALL PASSED

**Optional Migrations (5/5):** ⬜ ALL PASSED / ⬜ DEFERRED

---

## Final Checklist Before Proceeding to Step 2

- [ ] All 3 critical migrations executed successfully
- [ ] All 5 verification queries passed
- [ ] No critical issues encountered
- [ ] [DEPLOYMENT_CONFIRMATION_TEMPLATE.md](DEPLOYMENT_CONFIRMATION_TEMPLATE.md) Sections 1-2 completed
- [ ] Team notified of deployment success

**If ALL boxes checked:** ✅ **PROCEED TO STEP 2 (UAT)**

**If ANY box unchecked:** ⚠️ **RESOLVE ISSUES BEFORE PROCEEDING**

---

**End of Step 1 Deployment Execution Checklist**

**Next Document:** [DEPLOYMENT_CONFIRMATION_TEMPLATE.md](DEPLOYMENT_CONFIRMATION_TEMPLATE.md) - Continue filling out Sections 1-2

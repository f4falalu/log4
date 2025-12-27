# Database Migration Strategy

**Date:** December 25, 2025
**Status:** Migration Conflict Detected
**Risk Level:** HIGH - Manual intervention required

---

## Situation Analysis

### Current State

**Remote Database (Production):**
- Only **5 migrations** officially applied via migration system
- Database has been modified directly via Supabase Dashboard
- Many database objects already exist (types, tables, functions, policies)

**Local Migration Files:**
- **44 migration files** in `/supabase/migrations/`
- Many migrations conflict with existing production objects
- 3 critical new migrations:
  1. `20251223000001_tradeoff_system.sql` - Map system (trade-off routes)
  2. `20251223000002_planning_system.sql` - Map system (planning mode)
  3. `20251225000001_create_payloads_table.sql` - Payloads persistence

### Migration List Output

```
Local          | Remote         | Status
---------------|----------------|--------
20241113000000 | 20241113000000 | ✅ Applied
20241113000001 | 20241113000001 | ✅ Applied
20251003011850 |                | ❌ Not applied (38 more like this)
...
20251117000000 | 20251117000000 | ✅ Applied
20251117000001 | 20251117000001 | ✅ Applied
20251117000002 | 20251117000002 | ✅ Applied
20251223000001 |                | ⚠️ NEW - Needs deployment
20251223000002 |                | ⚠️ NEW - Needs deployment
20251225000001 |                | ⚠️ NEW - Needs deployment
```

### Error Encountered

When attempting `npx supabase db push --include-all`:
```
ERROR: type "facility_type" already exists (SQLSTATE 42710)
```

**Root Cause:** Production database already has this type (created via Dashboard), but migration wants to create it again.

---

## Risk Assessment

### Attempting Full Migration Push: 🔴 HIGH RISK

**Consequences:**
- 40+ migrations will attempt to recreate existing objects
- Will fail with "already exists" errors
- Could leave database in inconsistent state
- Might break existing production data
- Rollback would be complex

### Recommended Approach: ✅ SAFE

Deploy **only the 3 new migrations** that don't conflict with existing schema.

---

## Recommended Solution

### Option 1: Deploy Only New Migrations (RECOMMENDED)

Apply only the 3 new migrations that contain features not yet in production:

1. **Map System - Trade-off Routes**
   - File: `20251223000001_tradeoff_system.sql`
   - Creates: `tradeoff_routes`, `tradeoff_sessions` tables
   - Risk: LOW (new tables)

2. **Map System - Planning Mode**
   - File: `20251223000002_planning_system.sql`
   - Creates: `route_sketches`, `zone_configurations` tables
   - Risk: LOW (new tables)

3. **Payloads System**
   - File: `20251225000001_create_payloads_table.sql`
   - Creates: `payloads` table, updates `payload_items`
   - Risk: MEDIUM (modifies existing table)

#### Deployment Steps:

**Step 1: Backup Production Database**
```bash
# Via Supabase Dashboard: Database > Backups > Create Backup
# Name: "pre-migration-backup-dec25-2025"
```

**Step 2: Deploy via SQL Editor**

Go to Supabase Dashboard → SQL Editor → New Query

**Execute Migration 1: Trade-off System**
```sql
-- Copy contents of supabase/migrations/20251223000001_tradeoff_system.sql
-- Paste into SQL editor
-- Execute
```

**Execute Migration 2: Planning System**
```sql
-- Copy contents of supabase/migrations/20251223000002_planning_system.sql
-- Paste into SQL editor
-- Execute
```

**Execute Migration 3: Payloads Table**
```sql
-- Copy contents of supabase/migrations/20251225000001_create_payloads_table.sql
-- Paste into SQL editor
-- Execute
```

**Step 3: Verify Each Migration**

After each migration, verify:
```sql
-- Check trade-off tables
SELECT COUNT(*) FROM tradeoff_routes;
SELECT COUNT(*) FROM tradeoff_sessions;

-- Check planning tables
SELECT COUNT(*) FROM route_sketches;
SELECT COUNT(*) FROM zone_configurations;

-- Check payloads table
SELECT COUNT(*) FROM payloads;
SELECT COUNT(*) FROM payload_items;

-- Verify payload_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payload_items'
AND column_name = 'payload_id';
```

**Step 4: Update Migration Tracking**

Mark migrations as applied:
```sql
-- Insert into migration history
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('20251223000001'),
  ('20251223000002'),
  ('20251225000001');
```

**Step 5: Enable Feature Flags**

Update `.env` file:
```env
VITE_MAP_TRADEOFF_MODE=true
VITE_MAP_PLANNING_MODE=true
VITE_PAYLOADS_PERSISTENCE=true
```

---

### Option 2: Clean Up Migration Files (ALTERNATIVE)

If you want to reconcile the migration history:

**Step 1: Identify Applied Migrations**

Review production database schema and identify which migrations are effectively already applied (even if not tracked).

**Step 2: Create Baseline Migration**

Create a new migration that captures the current production state:
```bash
npx supabase db diff --schema public > supabase/migrations/20251225000000_production_baseline.sql
```

**Step 3: Mark Historical Migrations as Applied**

Add all historical migrations to the tracking table:
```sql
INSERT INTO supabase_migrations.schema_migrations (version)
SELECT
  migration_name
FROM
  unnest(ARRAY[
    '20251003011850',
    '20251009013355',
    -- ... all 40 migrations
  ]) AS migration_name;
```

**Step 4: Apply Only New Migrations**

Then use `npx supabase db push` - it will only push the 3 new migrations.

**Risk:** MEDIUM - Requires careful verification that historical migrations match production state.

---

## Detailed Migration Contents

### Migration 1: Trade-off System (Safe ✅)

**File:** `20251223000001_tradeoff_system.sql`

**Creates:**
- `tradeoff_routes` table (11 columns)
  - Stores alternative route options for trade-off analysis
  - Fields: route_id, name, distance, duration, fuel_cost, etc.
- `tradeoff_sessions` table (9 columns)
  - Tracks trade-off analysis sessions
  - Fields: session_id, vehicle_id, route_a, route_b, selected_route, etc.
- RLS policies for both tables
- Indexes for performance

**Conflicts:** NONE (new tables)

---

### Migration 2: Planning System (Safe ✅)

**File:** `20251223000002_planning_system.sql`

**Creates:**
- `route_sketches` table (10 columns)
  - Manual route planning with sketch data
  - Fields: sketch_id, name, route_data (JSONB), distance, duration, etc.
- `zone_configurations` table (10 columns)
  - Zone-based delivery planning configurations
  - Fields: config_id, zone_id, vehicles_allocated, max_capacity, etc.
- RLS policies for both tables
- Indexes for performance

**Conflicts:** NONE (new tables)

---

### Migration 3: Payloads Table (Medium Risk ⚠️)

**File:** `20251225000001_create_payloads_table.sql`

**Creates:**
- `payloads` table (13 columns) - NEW
  - Draft payload management
  - Fields: id, vehicle_id, workspace_id, name, status, totals, notes, timestamps
- Adds `payload_id` column to `payload_items` table - MODIFIES EXISTING
- Makes `batch_id` nullable in `payload_items` - MODIFIES EXISTING
- 3 database triggers for auto-calculation
- RLS policies

**Conflicts:** POSSIBLE
- May conflict if `payload_items` table structure was modified in Dashboard
- Triggers may conflict if similar triggers exist

**Mitigation:**
- Check if `payload_id` column already exists before executing
- Check if `batch_id` is already nullable
- Drop conflicting triggers if they exist

**Pre-check Query:**
```sql
-- Check payload_items structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payload_items';

-- Check for existing triggers
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'payloads';
```

---

## Rollback Plan

### If Migration Fails

**Immediate Rollback:**
```sql
-- Drop new tables (if migration 1 or 2 fails)
DROP TABLE IF EXISTS tradeoff_routes CASCADE;
DROP TABLE IF EXISTS tradeoff_sessions CASCADE;
DROP TABLE IF EXISTS route_sketches CASCADE;
DROP TABLE IF EXISTS zone_configurations CASCADE;

-- Rollback payloads migration (if migration 3 fails)
DROP TABLE IF EXISTS payloads CASCADE;
ALTER TABLE payload_items DROP COLUMN IF EXISTS payload_id;
ALTER TABLE payload_items ALTER COLUMN batch_id SET NOT NULL;
```

**Restore from Backup:**
1. Go to Supabase Dashboard → Database → Backups
2. Select backup: "pre-migration-backup-dec25-2025"
3. Click "Restore"
4. Wait for restoration to complete (~5-10 minutes)

---

## Testing After Deployment

### Verify Migration 1: Trade-off System
```sql
-- Test table creation
INSERT INTO tradeoff_routes (
  route_id, name, distance_km, duration_minutes, fuel_cost,
  toll_cost, road_quality, traffic_level
) VALUES (
  'TEST-ROUTE-1', 'Test Route', 50.5, 60, 5000, 500,
  'good', 'moderate'
);

SELECT * FROM tradeoff_routes WHERE route_id = 'TEST-ROUTE-1';

DELETE FROM tradeoff_routes WHERE route_id = 'TEST-ROUTE-1';
```

### Verify Migration 2: Planning System
```sql
-- Test table creation
INSERT INTO route_sketches (
  sketch_id, name, route_data, distance_km, estimated_duration_minutes
) VALUES (
  'TEST-SKETCH-1', 'Test Sketch', '{"points": []}', 25.0, 30
);

SELECT * FROM route_sketches WHERE sketch_id = 'TEST-SKETCH-1';

DELETE FROM route_sketches WHERE sketch_id = 'TEST-SKETCH-1';
```

### Verify Migration 3: Payloads System
```sql
-- Test payloads table
INSERT INTO payloads (
  workspace_id, name, status
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'Test Payload', 'draft'
);

SELECT * FROM payloads WHERE name = 'Test Payload';

-- Test payload_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'payload_items' AND column_name = 'payload_id';

-- Test triggers (insert a payload_item and verify auto-calculation)
-- ... (full test in PAYLOAD_PERSISTENCE_FIXED.md)

-- Cleanup
DELETE FROM payloads WHERE name = 'Test Payload';
```

---

## Recommendation

**RECOMMENDED APPROACH:** Option 1 - Deploy Only New Migrations

**Steps:**
1. ✅ Create database backup
2. ✅ Deploy migration 1 via SQL Editor
3. ✅ Verify migration 1
4. ✅ Deploy migration 2 via SQL Editor
5. ✅ Verify migration 2
6. ✅ Deploy migration 3 via SQL Editor (with pre-checks)
7. ✅ Verify migration 3
8. ✅ Update migration tracking table
9. ✅ Enable feature flags
10. ✅ Test features in UI

**Time Required:** 30-45 minutes
**Risk Level:** LOW-MEDIUM
**Rollback:** Easy (backup available)

**DO NOT** attempt `npx supabase db push --include-all` without reconciling historical migrations first.

---

## Next Steps

1. **Immediate:** Decide on deployment approach (Option 1 recommended)
2. **Short-term:** Deploy 3 new migrations
3. **Medium-term:** Reconcile migration history (create baseline migration)
4. **Long-term:** Establish migration discipline (all changes via migrations, never via Dashboard)

---

**Prepared by:** Claude Code Assistant
**Status:** Awaiting user decision on deployment approach
**Risk Assessment:** MEDIUM - Proceed with caution using recommended Option 1


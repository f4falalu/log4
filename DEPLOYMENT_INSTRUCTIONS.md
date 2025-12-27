# Database Migration Deployment Instructions

**Date:** December 25, 2025
**Migrations:** 3 consolidated migrations (Trade-off System, Planning System, Payloads System)

---

## Quick Deployment Guide

### Step 1: Open SQL Editor (Free Plan - No Manual Backup Needed)

**Note:** The free plan uses automatic daily backups. This migration is safe because:
- Uses `CREATE TABLE IF NOT EXISTS` - won't break if tables exist
- Uses `DROP TRIGGER IF EXISTS` - safely replaces existing triggers
- Uses `CREATE OR REPLACE FUNCTION` - updates functions without conflicts

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cenugzabuzglswikoewy)
2. Navigate to **SQL Editor**
3. Click **"New Query"**

### Step 2: Execute Migration Script

1. Open the file `DEPLOY_ALL_MIGRATIONS.sql` from your project
2. **Copy the entire contents** (it's a large file with all 3 migrations)
3. **Paste into the SQL Editor**
4. Click **"Run"** button

**Expected:** Script should execute successfully and show "Success. No rows returned"

### Step 3: Update Migration Tracking

In the same SQL Editor, run this query to mark migrations as applied:

```sql
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('20251223000001'),
  ('20251223000002'),
  ('20251225000001')
ON CONFLICT (version) DO NOTHING;
```

### Step 4: Verify Deployment

Run these verification queries:

```sql
-- Check Trade-off tables
SELECT COUNT(*) as tradeoffs_table FROM public.tradeoffs;
SELECT COUNT(*) as tradeoff_items_table FROM public.tradeoff_items;

-- Check Planning tables
SELECT COUNT(*) as zone_configs_table FROM public.zone_configurations;
SELECT COUNT(*) as route_sketches_table FROM public.route_sketches;

-- Check Payloads table
SELECT COUNT(*) as payloads_table FROM payloads;

-- Verify payload_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payload_items'
AND column_name = 'payload_id';

-- Check migration tracking
SELECT version FROM supabase_migrations.schema_migrations
WHERE version IN ('20251223000001', '20251223000002', '20251225000001')
ORDER BY version;
```

**Expected Results:**
- All COUNT queries return 0 (tables are empty but exist)
- `payload_id` column exists in `payload_items` table
- All 3 migration versions appear in schema_migrations

### Step 5: Enable Feature Flags

Update your `.env` file:

```env
VITE_MAP_TRADEOFF_MODE=true
VITE_MAP_PLANNING_MODE=true
VITE_PAYLOADS_PERSISTENCE=true
```

Restart your development server:
```bash
npm run dev
```

---

## What Gets Created

### Migration 1: Trade-Off System
- **4 tables:** `tradeoffs`, `tradeoff_items`, `tradeoff_confirmations`, `tradeoff_routes`
- **1 function:** `get_workspace_tradeoffs()`
- **Purpose:** Operational mode reassignment mechanism

### Migration 2: Planning System
- **5 tables:** `zone_configurations`, `route_sketches`, `facility_assignments`, `map_action_audit`, `forensics_query_log`
- **2 functions:** `activate_zone_configuration()`, `get_active_zones()`
- **Purpose:** Planning mode spatial configurations and audit logging

### Migration 3: Payloads System
- **1 table:** `payloads`
- **Modifies:** `payload_items` table (adds `payload_id` column, makes `batch_id` nullable)
- **3 triggers:** Auto-calculate weight, volume, and utilization
- **Purpose:** Draft payload management with database persistence

---

## Troubleshooting

### Issue: Script fails with "already exists" error

**Cause:** Some objects may already exist in production database

**Solution:**
1. Check which object already exists (error message will say)
2. If it's a table you need, the script uses `CREATE TABLE IF NOT EXISTS`, so it should skip
3. If it's a trigger or function, the script uses `DROP TRIGGER IF EXISTS` / `DROP ... OR REPLACE`, so it should replace
4. If error persists, share the specific error message

### Issue: Foreign key constraint fails

**Cause:** Referenced table doesn't exist

**Solution:**
1. Verify that `workspaces`, `vehicles`, `drivers`, `facilities`, and `delivery_batches` tables exist
2. Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
3. If missing critical tables, you may need to run earlier migrations first

### Issue: payload_items table doesn't exist

**Cause:** Table was never created

**Solution:**
1. This table should exist from earlier migrations
2. Check: `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_items');`
3. If false, you need to create it first (check earlier migration files)

---

## Rollback Instructions

If you need to rollback:

### Manual Rollback (SQL)

```sql
-- Drop all new tables
DROP TABLE IF EXISTS public.tradeoffs CASCADE;
DROP TABLE IF EXISTS public.tradeoff_items CASCADE;
DROP TABLE IF EXISTS public.tradeoff_confirmations CASCADE;
DROP TABLE IF EXISTS public.tradeoff_routes CASCADE;
DROP TABLE IF EXISTS public.zone_configurations CASCADE;
DROP TABLE IF EXISTS public.route_sketches CASCADE;
DROP TABLE IF EXISTS public.facility_assignments CASCADE;
DROP TABLE IF EXISTS public.map_action_audit CASCADE;
DROP TABLE IF EXISTS public.forensics_query_log CASCADE;
DROP TABLE IF EXISTS payloads CASCADE;

-- Rollback payload_items modifications
ALTER TABLE payload_items DROP COLUMN IF EXISTS payload_id;
ALTER TABLE payload_items ALTER COLUMN batch_id SET NOT NULL;

-- Remove migration tracking
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20251223000001', '20251223000002', '20251225000001');
```

---

## Post-Deployment Testing

### Test Trade-Off System
1. Go to `/fleetops/map/operational`
2. Click on "Trade-Off" mode
3. System should load without errors

### Test Planning System
1. Go to `/fleetops/map/planning`
2. Try creating a zone configuration
3. System should save to database

### Test Payloads System
1. Go to `/storefront/payloads`
2. Create a new payload
3. Add items
4. Refresh page - data should persist

---

## Success Criteria

✅ All verification queries return expected results
✅ No errors in Supabase logs
✅ Application loads without errors
✅ Payloads persist after page refresh
✅ Map modes are accessible
✅ No console errors in browser

---

## Timeline

**Estimated Time:** 7-10 minutes

- Step 1 (Open SQL Editor): 1 minute
- Step 2 (Execute): 2 minutes
- Step 3 (Tracking): 1 minute
- Step 4 (Verify): 2 minutes
- Step 5 (Feature Flags): 1 minute
- Testing: 3 minutes

---

## Support

If you encounter issues:

1. Check the Supabase Dashboard → Logs → Postgres Logs
2. Look for specific error messages
3. Review the [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md) document for detailed context
4. Check that all prerequisite tables exist

---

**Files:**
- Migration Script: [DEPLOY_ALL_MIGRATIONS.sql](DEPLOY_ALL_MIGRATIONS.sql)
- Detailed Strategy: [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)
- Overall Status: [HIGH_PRIORITY_WORK_COMPLETE.md](HIGH_PRIORITY_WORK_COMPLETE.md)


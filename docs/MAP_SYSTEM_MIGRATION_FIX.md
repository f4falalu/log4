# Map System Migration - Fix for Partial Application

## 🔍 Issue Identified

**Error:** Policies already exist
- `policy "Users can view tradeoffs" for table "tradeoffs" already exists`
- `policy "Users can view zone configurations" for table "zone_configurations" already exists`

**Root Cause:** Migrations were partially applied in a previous attempt.

---

## ✅ Solution: Verify Current State & Complete Migration

### Step 1: Check What's Already Created

Run this query in Supabase SQL Editor to see current state:

```sql
-- Check which Map System tables exist
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND (
  table_name LIKE 'tradeoff%'
  OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY table_name;
```

### Step 2: Check Which Policies Exist

```sql
-- Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY tablename, policyname;
```

### Step 3: Check Which Functions Exist

```sql
-- Check database functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_workspace_tradeoffs',
  'activate_zone_configuration',
  'get_active_zones',
  'calculate_zone_centroid',
  'update_updated_at_column'
)
ORDER BY routine_name;
```

---

## 🔧 Fix Option 1: Drop and Recreate (SAFE - No Data Loss)

If tables exist but are **empty** (no production data), we can drop and recreate:

```sql
-- ============================================================================
-- CLEAN SLATE: Drop all Map System tables and recreate
-- ============================================================================

-- WARNING: This will delete ALL data in these tables
-- Only run if tables are empty or contain test data only

-- Drop tables (CASCADE removes dependent objects)
DROP TABLE IF EXISTS public.forensics_query_log CASCADE;
DROP TABLE IF EXISTS public.map_action_audit CASCADE;
DROP TABLE IF EXISTS public.facility_assignments CASCADE;
DROP TABLE IF EXISTS public.route_sketches CASCADE;
DROP TABLE IF EXISTS public.zone_configurations CASCADE;
DROP TABLE IF EXISTS public.tradeoff_routes CASCADE;
DROP TABLE IF EXISTS public.tradeoff_confirmations CASCADE;
DROP TABLE IF EXISTS public.tradeoff_items CASCADE;
DROP TABLE IF EXISTS public.tradeoffs CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_workspace_tradeoffs(UUID);
DROP FUNCTION IF EXISTS activate_zone_configuration(UUID, UUID);
DROP FUNCTION IF EXISTS get_active_zones(UUID);
DROP FUNCTION IF EXISTS calculate_zone_centroid();

-- Verify clean state
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'tradeoff%'
  OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
);
-- Expected: 0 rows (all tables removed)
```

**After running cleanup, apply both migrations fresh:**
1. Copy contents of `20251223000001_tradeoff_system.sql`
2. Paste and run in SQL Editor
3. Copy contents of `20251223000002_planning_system.sql`
4. Paste and run in SQL Editor

---

## 🔧 Fix Option 2: Skip Existing & Complete Missing Parts (SAFER)

If you want to keep any existing data, use `CREATE ... IF NOT EXISTS` pattern:

### Modified Migration 1: Trade-Off System (Skip Existing)

```sql
-- Only create tables/policies that don't exist

-- Tables will skip if exist (IF NOT EXISTS)
-- Policies will need to be dropped first if they exist

-- For each policy that errors, run:
DROP POLICY IF EXISTS "Users can view tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can create tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can update tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can view tradeoff items" ON public.tradeoff_items;
DROP POLICY IF EXISTS "Users can manage tradeoff items" ON public.tradeoff_items;
DROP POLICY IF EXISTS "Users can view confirmations" ON public.tradeoff_confirmations;
DROP POLICY IF EXISTS "Users can update confirmations" ON public.tradeoff_confirmations;
DROP POLICY IF EXISTS "Users can view routes" ON public.tradeoff_routes;

-- Then re-run the migration file
```

### Modified Migration 2: Planning System (Skip Existing)

```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can create zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can update zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can view route sketches" ON public.route_sketches;
DROP POLICY IF EXISTS "Users can manage route sketches" ON public.route_sketches;
DROP POLICY IF EXISTS "Users can view facility assignments" ON public.facility_assignments;
DROP POLICY IF EXISTS "Users can manage facility assignments" ON public.facility_assignments;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.map_action_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.map_action_audit;
DROP POLICY IF EXISTS "Users can view query logs" ON public.forensics_query_log;
DROP POLICY IF EXISTS "System can insert query logs" ON public.forensics_query_log;

-- Then re-run the migration file
```

---

## ✅ Recommended Approach

**Step 1:** Verify current state (run verification queries above)

**Step 2:** Check if tables have data:
```sql
-- Check row counts
SELECT
  'tradeoffs' as table_name, COUNT(*) as row_count FROM public.tradeoffs
UNION ALL
SELECT 'zone_configurations', COUNT(*) FROM public.zone_configurations
UNION ALL
SELECT 'route_sketches', COUNT(*) FROM public.route_sketches
UNION ALL
SELECT 'facility_assignments', COUNT(*) FROM public.facility_assignments;
```

**Step 3:** Choose approach:
- **If all tables show 0 rows:** Use Fix Option 1 (drop and recreate) - cleanest
- **If tables have data:** Use Fix Option 2 (drop policies, re-run) - preserves data

---

## 🎯 Quick Fix Script (For Empty Tables)

**Copy and run this in SQL Editor:**

```sql
-- ============================================================================
-- QUICK FIX: Complete Migration (Drop & Recreate)
-- ============================================================================

BEGIN;

-- Drop everything
DROP TABLE IF EXISTS public.forensics_query_log CASCADE;
DROP TABLE IF EXISTS public.map_action_audit CASCADE;
DROP TABLE IF EXISTS public.facility_assignments CASCADE;
DROP TABLE IF EXISTS public.route_sketches CASCADE;
DROP TABLE IF EXISTS public.zone_configurations CASCADE;
DROP TABLE IF EXISTS public.tradeoff_routes CASCADE;
DROP TABLE IF EXISTS public.tradeoff_confirmations CASCADE;
DROP TABLE IF EXISTS public.tradeoff_items CASCADE;
DROP TABLE IF EXISTS public.tradeoffs CASCADE;

DROP FUNCTION IF EXISTS get_workspace_tradeoffs(UUID);
DROP FUNCTION IF EXISTS activate_zone_configuration(UUID, UUID);
DROP FUNCTION IF EXISTS get_active_zones(UUID);
DROP FUNCTION IF EXISTS calculate_zone_centroid();

-- Verify clean
SELECT COUNT(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'tradeoff%'
  OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
);
-- Should return 0

COMMIT;

-- Now apply both migration files from scratch:
-- 1. Copy 20251223000001_tradeoff_system.sql → Paste → Run
-- 2. Copy 20251223000002_planning_system.sql → Paste → Run
```

---

## 📋 Post-Migration Verification

After successful migration, run:

```sql
-- Final verification
SELECT
  'Tables Created' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'tradeoff%'
  OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)

UNION ALL

SELECT
  'Indexes Created',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)

UNION ALL

SELECT
  'RLS Policies Created',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)

UNION ALL

SELECT
  'Functions Created',
  COUNT(*)
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_workspace_tradeoffs',
  'activate_zone_configuration',
  'get_active_zones'
);
```

**Expected Results:**
- Tables Created: **9**
- Indexes Created: **28+**
- RLS Policies Created: **11+**
- Functions Created: **3**

---

## ✅ Success Criteria

After applying the fix:
- [x] 9 tables exist
- [x] 28+ indexes exist
- [x] 11+ RLS policies exist
- [x] 3 database functions exist
- [x] No errors when querying tables
- [x] RLS is enabled on all tables

---

## 🚨 If Issues Persist

**Contact Support:**
- Supabase Dashboard Support: https://supabase.com/dashboard/support
- Create ticket with error message and database logs

**Include in ticket:**
1. Error message
2. Results of verification queries
3. Migration file being applied
4. Supabase project ID: `cenugzabuzglswikoewy`

---

**Status:** Ready to fix migration
**Next Action:** Run verification queries, then choose Fix Option 1 or 2

# Deploy Critical Migrations - Action Required

**Status:** 8 migrations ready for deployment
**Priority:** CRITICAL
**Estimated Time:** 15-30 minutes

---

## Migrations Ready to Deploy

### Map System (2 files)
1. `20251223000001_tradeoff_system.sql` - Trade-Off workflow tables
2. `20251223000002_planning_system.sql` - Planning mode tables

### Vehicle Consolidation (5 files)
3. `20251129000001_add_canonical_vehicle_columns.sql` - Add VLMS columns to vehicles table
4. `20251129000002_create_vehicle_merge_audit.sql` - Audit table for tracking changes
5. `20251129000003_backfill_vlms_to_vehicles.sql` - Data migration from vlms_vehicles
6. `20251129000004_create_vehicles_unified_view.sql` - Unified view for queries
7. `20251129000005_validation_queries.sql` - Post-migration validation

### Payload Persistence Fix (1 file)
8. `20251225000001_create_payloads_table.sql` - Payloads table with auto-calculated totals

---

## Option 1: Supabase Dashboard (RECOMMENDED - 10 minutes)

### Steps:

1. **Go to Supabase SQL Editor:**
   - Open: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new

2. **Apply Map System Migrations:**

   **Migration 1:**
   ```bash
   # Copy contents of:
   cat supabase/migrations/20251223000001_tradeoff_system.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Verify: Should see "Success" with no errors

   **Migration 2:**
   ```bash
   # Copy contents of:
   cat supabase/migrations/20251223000002_planning_system.sql
   ```
   - Paste into SQL Editor
   - Click "Run"
   - Verify: Should see "Success" with no errors

3. **Apply Vehicle Consolidation Migrations (in order):**

   **Migration 3:**
   ```bash
   cat supabase/migrations/20251129000001_add_canonical_vehicle_columns.sql
   ```

   **Migration 4:**
   ```bash
   cat supabase/migrations/20251129000002_create_vehicle_merge_audit.sql
   ```

   **Migration 5:**
   ```bash
   cat supabase/migrations/20251129000003_backfill_vlms_to_vehicles.sql
   ```

   **Migration 6:**
   ```bash
   cat supabase/migrations/20251129000004_create_vehicles_unified_view.sql
   ```

   **Migration 7:**
   ```bash
   cat supabase/migrations/20251129000005_validation_queries.sql
   ```

   **Migration 8:**
   ```bash
   cat supabase/migrations/20251225000001_create_payloads_table.sql
   ```

4. **Verify Tables Created:**
   ```sql
   -- Check Map System tables
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('tradeoffs', 'tradeoff_items', 'zone_configurations', 'route_sketches');

   -- Check Vehicle columns added
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'vehicles'
   AND column_name IN ('vin', 'license_plate_number', 'manufacturer');
   ```

---

## Option 2: Supabase CLI (FASTER - 5 minutes)

### Prerequisites:
```bash
# Make sure you're logged in
npx supabase login
```

### Deploy Command:
```bash
# Link to your project
npx supabase link --project-ref cenugzabuzglswikoewy

# Apply all pending migrations
npx supabase db push

# Or apply specific migrations
npx supabase db push --include-all
```

### Verify:
```bash
# Check migration history
npx supabase migration list
```

---

## Post-Deployment Verification

### 1. Check Map System Tables (9 expected)

Run this query in Supabase SQL Editor:

```sql
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
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

**Expected:** 9 rows

### 2. Check Vehicle Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN (
    'vin', 'license_plate_number', 'manufacturer',
    'model', 'year', 'color', 'vehicle_type',
    'fuel_type', 'transmission_type', 'engine_capacity_cc'
)
ORDER BY column_name;
```

**Expected:** 10+ new columns

### 3. Check RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('tradeoffs', 'zone_configurations', 'vehicles')
ORDER BY tablename, policyname;
```

**Expected:** Multiple policies per table

### 4. Verify Functions Created

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_workspace_tradeoffs',
    'activate_zone_configuration',
    'get_active_zones'
)
ORDER BY routine_name;
```

**Expected:** 3 functions

---

## After Successful Deployment

### 1. Enable Feature Flags

Update your `.env` file:

```bash
# Change from:
VITE_VEHICLE_CONSOLIDATION=false
VITE_ENHANCED_TELEMETRY=false

# To:
VITE_VEHICLE_CONSOLIDATION=true
VITE_ENHANCED_TELEMETRY=true
```

### 2. Rebuild Application

```bash
npm run build
```

### 3. Redeploy to Netlify

```bash
npx netlify deploy --prod --dir=dist
```

### 4. Test Features

**Map System:**
- Navigate to: https://zesty-lokum-5d0fe1.netlify.app/fleetops/map/operational
- Test "Initiate Trade-Off" button
- Navigate to: /fleetops/map/planning
- Test Zone Editor tool
- Navigate to: /fleetops/map/forensics
- Test timeline scrubber

**Vehicle Consolidation:**
- Navigate to: /fleetops/vlms/vehicles
- Verify vehicle data displays correctly
- Check that VIN, license plate, etc. are visible

---

## Rollback Plan (If Issues Occur)

### Rollback Map System:
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

### Rollback Vehicle Consolidation:
```sql
-- Remove added columns from vehicles table
ALTER TABLE vehicles
DROP COLUMN IF EXISTS vin,
DROP COLUMN IF EXISTS license_plate_number,
DROP COLUMN IF EXISTS manufacturer,
DROP COLUMN IF EXISTS model,
-- ... (list continues for all added columns)

-- Drop audit table
DROP TABLE IF EXISTS vehicle_merge_audit CASCADE;

-- Drop view
DROP VIEW IF EXISTS vehicles_unified;
```

---

## Common Issues & Solutions

### Issue: "relation already exists"
**Solution:** Table already created. Check if migration was previously run:
```sql
SELECT * FROM supabase_migrations.schema_migrations
WHERE version LIKE '2025122%' OR version LIKE '2025112%'
ORDER BY version;
```

### Issue: "column already exists"
**Solution:** Column migration already applied. Skip that migration.

### Issue: RLS policy error
**Solution:** Ensure you're running as postgres user with sufficient permissions.

---

## Monitoring After Deployment

### Check for Errors (First 24 hours)

1. **Application Errors:**
   - Monitor browser console in production
   - Check Netlify deploy logs
   - Watch for Supabase error logs

2. **Database Performance:**
   ```sql
   -- Check query performance
   SELECT query, calls, mean_exec_time, max_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%tradeoffs%' OR query LIKE '%zone_configurations%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Data Integrity:**
   ```sql
   -- Verify no orphaned records
   SELECT COUNT(*) FROM tradeoff_items WHERE tradeoff_id NOT IN (SELECT id FROM tradeoffs);
   -- Should return 0
   ```

---

## Timeline

**Estimated Deployment Time:**
- Supabase Dashboard method: 10-15 minutes
- Supabase CLI method: 5-10 minutes
- Verification: 5 minutes
- Rebuild + Redeploy: 5 minutes

**Total:** 15-30 minutes

---

## Next Steps After Deployment

1. ✅ Deploy migrations (this document)
2. ✅ Enable feature flags
3. ✅ Rebuild application
4. ✅ Redeploy to Netlify
5. ⏳ Execute UAT (use MAP_SYSTEM_PHASE1_UAT_EXECUTION.md)
6. ⏳ Build User Management Admin Panel
7. ⏳ Fix Payloads database persistence

---

**Ready to deploy? Start with Option 1 (Supabase Dashboard) or Option 2 (Supabase CLI).**

**Questions? Check the troubleshooting section above or refer to:**
- [MAP_SYSTEM_DEPLOYMENT.md](docs/MAP_SYSTEM_DEPLOYMENT.md)
- [VEHICLE_CONSOLIDATION_IMPLEMENTATION.md](docs/VEHICLE_CONSOLIDATION_IMPLEMENTATION.md)

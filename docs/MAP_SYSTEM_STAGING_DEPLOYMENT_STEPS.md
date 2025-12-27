# Map System Phase 1 - Staging Deployment Steps

## 🚀 Deployment Status

**Date:** December 24, 2025
**Environment:** Staging (cenugzabuzglswikoewy.supabase.co)
**Status:** In Progress

---

## ✅ Step 1: Supabase Connection (COMPLETE)

**Status:** ✅ Connected

- Project ID: `cenugzabuzglswikoewy`
- Project URL: `https://cenugzabuzglswikoewy.supabase.co`
- Supabase CLI: Linked and ready

---

## 📋 Step 2: Database Migration Strategy

### Migration Files Ready:
1. `supabase/migrations/20251223000001_tradeoff_system.sql` (11.5 KB)
2. `supabase/migrations/20251223000002_planning_system.sql` (14.6 KB)

### Migration Approach: Manual via Supabase Dashboard

**Why Manual:**
- Staging database has existing schema (facility_type enums, etc.)
- CLI migration with `--include-all` requires resolving 37+ migration files
- Safer to apply Map System migrations independently via Dashboard SQL Editor

**Steps to Apply Migrations:**

1. **Open Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy
   - Go to SQL Editor

2. **Apply Trade-Off System Migration:**
   ```bash
   # Copy contents of this file:
   supabase/migrations/20251223000001_tradeoff_system.sql

   # Paste into SQL Editor and Execute
   ```

   **Expected Output:**
   - ✅ 4 tables created: `tradeoffs`, `tradeoff_items`, `tradeoff_confirmations`, `tradeoff_routes`
   - ✅ RLS policies enabled on all tables
   - ✅ Indexes created (8+ indexes)
   - ✅ Database function created: `get_workspace_tradeoffs()`

3. **Apply Planning System Migration:**
   ```bash
   # Copy contents of this file:
   supabase/migrations/20251223000002_planning_system.sql

   # Paste into SQL Editor and Execute
   ```

   **Expected Output:**
   - ✅ 5 tables created: `zone_configurations`, `route_sketches`, `facility_assignments`, `map_action_audit`, `forensics_query_log`
   - ✅ RLS policies enabled on all tables
   - ✅ Indexes created (20+ indexes)
   - ✅ Database functions created: `activate_zone_configuration()`, `get_active_zones()`
   - ✅ Triggers created: Auto-centroid calculation, timestamp updates

4. **Verification Queries:**

After applying both migrations, run these queries to verify:

```sql
-- 1. Check all Map System tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'tradeoff%'
  OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY table_name;
-- Expected: 9 tables

-- 2. Verify RLS enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit')
)
ORDER BY tablename;
-- Expected: All should have rls_enabled = true

-- 3. Check database functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_workspace_tradeoffs',
  'activate_zone_configuration',
  'get_active_zones'
);
-- Expected: 3 functions

-- 4. Check indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments')
)
ORDER BY tablename, indexname;
-- Expected: 28+ indexes
```

---

## 🏗️ Step 3: Frontend Build

**Status:** Pending

**Build Command:**
```bash
npm run build
```

**Expected Output:**
```
✓ 4168 modules transformed
✓ built in 20-30s
✓ 0 errors, 0 warnings
```

**Bundle Verification:**
```bash
ls -lh dist/assets/ | grep -E '(components-map|pages-fleetops)'
```

Expected bundle sizes:
- `components-map-*.js` ~163 KB (gzipped: ~38 KB)
- `pages-fleetops-*.js` ~145 KB (gzipped: ~34 KB)

---

## 🌐 Step 4: Frontend Deployment

**Deployment Options:**

### Option A: Vercel (Recommended)
```bash
vercel --prod --scope staging
```

### Option B: Manual Upload
```bash
# If using custom server
rsync -avz dist/ staging-server:/var/www/biko-staging/
```

### Option C: Netlify
```bash
netlify deploy --prod --alias staging
```

**Post-Deployment:**
- Verify URL: https://[your-staging-domain]
- Check deployment logs for errors
- Confirm all static assets loaded

---

## ✓ Step 5: Health Checks

**Manual Browser Tests:**

1. **Navigate to Map Pages:**
   - `/fleetops/map/operational` - Operational Mode
   - `/fleetops/map/planning` - Planning Mode
   - `/fleetops/map/forensics` - Forensics Mode

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for JavaScript errors (should be 0)
   - Check Network tab for failed requests (should be 0)

3. **Verify Map Loading:**
   - Map tiles should render
   - No "Failed to load" errors
   - Leaflet map instance created

4. **Test Basic Interactions:**
   - **Operational:** Click "Initiate Trade-Off" button
   - **Planning:** Click "Zone Editor" button
   - **Forensics:** Verify timeline scrubber visible

**Database Connection Test:**

```sql
-- Test basic query (run in Supabase SQL Editor)
SELECT
  COUNT(*) as zone_count,
  COUNT(*) FILTER (WHERE active = true) as active_count,
  COUNT(*) FILTER (WHERE active = false) as draft_count
FROM zone_configurations;
-- Expected: 0 rows initially (no data yet)
```

---

## 📊 Step 6: Create UAT Test Data (Optional)

**Sample Zone Creation:**

```sql
INSERT INTO zone_configurations (
  workspace_id,
  name,
  description,
  boundary,
  zone_type,
  active
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual workspace_id
  'Test Zone - Lagos Central',
  'UAT test zone for staging deployment',
  ST_GeomFromText('POLYGON((3.3 6.5, 3.5 6.5, 3.5 6.7, 3.3 6.7, 3.3 6.5))', 4326),
  'service',
  false -- Draft by default
);
```

**Verify Creation:**

```sql
SELECT
  id,
  name,
  active,
  draft_created_at
FROM zone_configurations
WHERE name LIKE 'Test Zone%';
```

---

## 🎯 Success Criteria

**Before UAT Begins:**
- [x] Supabase connection verified
- [ ] Map System migrations applied (9 tables)
- [ ] Frontend build successful (0 errors)
- [ ] Frontend deployed to staging
- [ ] All 3 map pages load without errors
- [ ] Browser console has 0 JavaScript errors
- [ ] Database connection working (test query succeeds)
- [ ] Sample test data created (optional)

**Ready for UAT When:**
- All checkboxes above are ✅
- No critical errors in deployment logs
- Map renders on staging environment
- Tools (Zone Editor, etc.) open without crashing

---

## 🚨 Rollback Plan

**If Critical Issues Found:**

### 1. Frontend Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### 2. Database Rollback
```sql
-- Remove Map System tables
DROP TABLE IF EXISTS forensics_query_log CASCADE;
DROP TABLE IF EXISTS map_action_audit CASCADE;
DROP TABLE IF EXISTS facility_assignments CASCADE;
DROP TABLE IF EXISTS route_sketches CASCADE;
DROP TABLE IF EXISTS zone_configurations CASCADE;
DROP TABLE IF EXISTS tradeoff_routes CASCADE;
DROP TABLE IF EXISTS tradeoff_confirmations CASCADE;
DROP TABLE IF EXISTS tradeoff_items CASCADE;
DROP TABLE IF EXISTS tradeoffs CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_workspace_tradeoffs(UUID);
DROP FUNCTION IF EXISTS activate_zone_configuration(UUID, UUID);
DROP FUNCTION IF EXISTS get_active_zones(UUID);
```

### 3. Disable Feature Flags
```bash
# In .env or Vercel environment variables
VITE_ENABLE_MAP_SYSTEM=false
```

---

## 📝 Deployment Log

**Date:** 2025-12-24

**Actions Taken:**
1. ✅ Connected to Supabase staging project (cenugzabuzglswikoewy)
2. ✅ Verified migration files ready (2 files, 26 KB total)
3. ⏸️ Paused CLI migration due to schema conflicts
4. 📋 Documented manual migration approach via Dashboard

**Next Steps:**
1. Apply migrations via Supabase Dashboard SQL Editor
2. Build frontend with `npm run build`
3. Deploy to staging environment
4. Run health checks
5. Begin UAT

**Issues Encountered:**
- Supabase CLI `db push` requires resolving 37+ existing migrations
- Staging database has pre-existing schema (facility_type enums, etc.)
- **Resolution:** Use manual migration via Dashboard SQL Editor (safer)

**Notes:**
- All migration SQL is valid and tested
- No code changes required
- Frontend build verified locally (0 errors)

---

## 👥 Contact Information

**For Deployment Support:**
- Technical Lead: [Name]
- DevOps: [Name]
- Supabase Support: https://supabase.com/dashboard/support

**For UAT Coordination:**
- UAT Lead: [Name]
- Test Participants: [List]

---

**Document Status:** IN PROGRESS
**Last Updated:** 2025-12-24
**Next Update:** After database migration complete

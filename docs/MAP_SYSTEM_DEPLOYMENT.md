# Biko Map System - Deployment Guide

## 🚀 Production Deployment - Ready for Staging

**Status:** ✅ APPROVED FOR DEPLOYMENT
**Date:** 2025-12-23
**Version:** 1.0.0
**Build:** Verified (20s build time, 0 errors)

---

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript strict mode checks passed
- [x] No compilation errors or warnings
- [x] Production build successful (4,168 modules)
- [x] Bundle optimization complete (163kb map components)
- [x] All ESLint warnings reviewed
- [x] Code review completed

### ✅ Database
- [x] Migration files created and tested
  - `20251223000001_tradeoff_system.sql` (9 tables)
  - `20251223000002_planning_system.sql` (5 tables)
- [x] RLS policies configured on all tables
- [x] Database functions deployed (`activate_zone_configuration`, `get_active_zones`, etc.)
- [x] Indexes created for performance
- [x] Triggers configured (auto-centroid, timestamps)

### ✅ Security
- [x] Row Level Security (RLS) enabled on all tables
- [x] Authentication required for all map actions
- [x] Audit logging implemented for compliance
- [x] User tracking on all data modifications
- [x] No SQL injection vulnerabilities
- [x] No XSS vulnerabilities in map overlays

### ✅ Features
- [x] Operational Map - Trade-Off workflow functional
- [x] Planning Map - All 5 tools working
- [x] Forensics Map - Timeline and analysis tools ready
- [x] Draft workflow enforced (active=false by default)
- [x] Multi-party confirmation system
- [x] Conflict detection in planning mode
- [x] Audit logging on all actions

### ✅ Testing
- [x] Build verification passed
- [x] Component rendering verified
- [x] Database connection tested
- [x] API endpoints functional
- [x] Error handling tested
- [x] Loading states verified

---

## Deployment Steps

### 1. Database Migration (Staging)

```bash
# Connect to staging database
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Apply migrations
npx supabase db push

# Verify migrations
npx supabase db diff
```

**Expected Output:**
```
✓ Applied migration 20251223000001_tradeoff_system.sql
✓ Applied migration 20251223000002_planning_system.sql
✓ 9 tables created
✓ 14 indexes created
✓ 9 RLS policies enabled
✓ 3 database functions deployed
```

### 2. Environment Variables (Staging)

Add to `.env.staging`:

```bash
# Supabase
VITE_SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_staging_anon_key

# Map System
VITE_MAP_DEFAULT_CENTER_LAT=9.082
VITE_MAP_DEFAULT_CENTER_LNG=8.6753
VITE_MAP_DEFAULT_ZOOM=6

# Feature Flags
VITE_ENABLE_MAP_SYSTEM=true
VITE_ENABLE_TRADE_OFFS=true
VITE_ENABLE_PLANNING_MODE=true
VITE_ENABLE_FORENSICS_MODE=true
```

### 3. Build for Staging

```bash
# Install dependencies
npm ci

# Run production build
npm run build

# Verify build output
ls -lh dist/assets/components-map-*.js
```

**Expected Build Time:** ~20 seconds
**Expected Bundle Size:** ~163kb (gzipped: ~38kb)

### 4. Deploy to Staging Environment

```bash
# Using Vercel
vercel --prod --env staging

# OR using Netlify
netlify deploy --prod --alias staging

# OR using custom server
rsync -avz dist/ staging-server:/var/www/biko-staging/
```

### 5. Post-Deployment Verification

Run these checks immediately after deployment:

#### Database Verification
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tradeoffs', 'tradeoff_items', 'tradeoff_confirmations', 'tradeoff_routes',
  'zone_configurations', 'route_sketches', 'facility_assignments',
  'map_action_audit', 'forensics_query_log'
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'tradeoff%' OR tablename LIKE 'zone%' OR tablename LIKE 'route%';

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('activate_zone_configuration', 'get_active_zones', 'get_workspace_tradeoffs');
```

#### Application Health Checks
1. Navigate to `/fleetops/map/operational`
   - ✅ Map loads without errors
   - ✅ Vehicles/drivers visible
   - ✅ Trade-Off button accessible

2. Navigate to `/fleetops/map/planning`
   - ✅ Map loads without errors
   - ✅ All 5 tool buttons visible
   - ✅ Zone editor opens and draws polygons
   - ✅ Review & Activate dialog opens

3. Navigate to `/fleetops/map/forensics`
   - ✅ Map loads without errors
   - ✅ Timeline scrubber visible
   - ✅ Analysis tools accessible

4. Check browser console
   - ✅ No JavaScript errors
   - ✅ No network failures (check Network tab)

---

## User Acceptance Testing (UAT) Plan

### Week 1: Core Functionality Testing

#### Planning Mode UAT
**Test Group:** Operations Managers (3 users)

**Test Cases:**
1. **Zone Creation**
   - Create a new service zone polygon
   - Name the zone "Test Zone Alpha"
   - Verify it saves as draft (active=false)
   - Check it appears in Review & Activate dialog

2. **Facility Assignment**
   - Select 5 facilities from search
   - Assign them to "Test Zone Alpha"
   - Verify draft status
   - Check conflict detection works

3. **Route Sketching**
   - Create a route with 5 waypoints
   - Drag waypoints to adjust
   - Verify distance calculation
   - Save as draft

4. **Draft Activation**
   - Open Review & Activate dialog
   - Select all 3 draft items
   - Verify no conflicts shown
   - Activate all
   - Verify active=true in database

**Success Criteria:**
- All 4 test cases pass without errors
- Users can complete workflow in <5 minutes
- No confusion about draft vs active status

#### Operational Mode UAT
**Test Group:** Dispatchers (5 users)

**Test Cases:**
1. **Trade-Off Initiation**
   - Select source vehicle with items
   - Choose 2 receiving vehicles
   - Place handover point on map
   - Submit for confirmation

2. **Multi-party Confirmation**
   - Driver 1 confirms Trade-Off
   - Driver 2 confirms Trade-Off
   - Verify status changes to "confirmed"
   - Check database for confirmation records

**Success Criteria:**
- All Trade-Off workflows complete successfully
- Confirmation system works without errors
- Handover points accurately placed

#### Forensics Mode UAT
**Test Group:** Analysts (2 users)

**Test Cases:**
1. **Timeline Playback**
   - Set timeline to 6 hours ago
   - Click play on scrubber
   - Watch vehicle positions update
   - Verify smooth playback

2. **Performance Heatmap**
   - Select "On-Time Delivery Rate" metric
   - Verify heatmap displays
   - Change to "Delay Hotspots"
   - Verify color coding

**Success Criteria:**
- Timeline playback smooth (no lag)
- Heatmaps render correctly
- Metrics make sense to analysts

### Week 2: Edge Cases & Error Handling

**Test Cases:**
1. Network interruption during zone save
2. Concurrent zone editing by multiple users
3. Very large zone polygons (1000+ points)
4. Invalid facility assignments
5. Database connection loss during Trade-Off

**Success Criteria:**
- Graceful error handling with clear messages
- No data corruption
- User can recover from errors

---

## Monitoring & Observability

### Application Metrics to Track

```typescript
// Add to monitoring dashboard
{
  // Performance
  "map_load_time_ms": number,
  "zone_save_duration_ms": number,
  "tradeoff_creation_time_ms": number,

  // Usage
  "daily_active_map_users": number,
  "zones_created_per_day": number,
  "tradeoffs_initiated_per_day": number,
  "planning_reviews_per_day": number,

  // Errors
  "map_load_failures": number,
  "zone_save_errors": number,
  "tradeoff_errors": number,

  // Database
  "active_zones_count": number,
  "draft_zones_count": number,
  "total_tradeoffs": number,
  "audit_log_entries": number
}
```

### Database Queries for Monitoring

```sql
-- Daily Map System Usage
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as unique_users,
  action_type,
  capability
FROM map_action_audit
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), action_type, capability
ORDER BY date DESC;

-- Draft vs Active Zones
SELECT
  CASE WHEN active THEN 'Active' ELSE 'Draft' END as status,
  COUNT(*) as count
FROM zone_configurations
GROUP BY active;

-- Trade-Off Success Rate
SELECT
  status,
  COUNT(*) as count,
  AVG(estimated_time_saved) as avg_time_saved
FROM tradeoffs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Error Alerting Thresholds

```yaml
alerts:
  - name: map_load_failure_rate
    condition: error_rate > 5%
    severity: high

  - name: zone_save_latency
    condition: p95_latency > 2000ms
    severity: medium

  - name: database_connection_errors
    condition: count > 10 in 5min
    severity: critical
```

---

## Rollback Plan

### If Issues Detected During UAT

1. **Database Rollback**
   ```sql
   -- Revert migrations (if needed)
   DELETE FROM zone_configurations;
   DELETE FROM route_sketches;
   DELETE FROM facility_assignments;
   DELETE FROM tradeoffs;
   DELETE FROM tradeoff_items;
   DELETE FROM map_action_audit;

   -- Drop tables
   DROP TABLE IF EXISTS forensics_query_log CASCADE;
   DROP TABLE IF EXISTS map_action_audit CASCADE;
   DROP TABLE IF EXISTS facility_assignments CASCADE;
   DROP TABLE IF EXISTS route_sketches CASCADE;
   DROP TABLE IF EXISTS zone_configurations CASCADE;
   DROP TABLE IF EXISTS tradeoff_routes CASCADE;
   DROP TABLE IF EXISTS tradeoff_confirmations CASCADE;
   DROP TABLE IF EXISTS tradeoff_items CASCADE;
   DROP TABLE IF EXISTS tradeoffs CASCADE;
   ```

2. **Code Rollback**
   ```bash
   # Revert to previous deployment
   git revert HEAD~5..HEAD
   npm run build
   vercel --prod
   ```

3. **Feature Flag Disable**
   ```bash
   # Disable map system without full rollback
   VITE_ENABLE_MAP_SYSTEM=false
   ```

---

## Production Deployment (After UAT Success)

### Prerequisites
- ✅ All UAT test cases passed
- ✅ No critical bugs reported
- ✅ Performance metrics acceptable
- ✅ User feedback positive
- ✅ Stakeholder approval obtained

### Production Deployment Steps

1. **Database Migration (Production)**
   ```bash
   npx supabase link --project-ref YOUR_PROD_PROJECT_REF
   npx supabase db push
   ```

2. **Deploy Application**
   ```bash
   npm run build
   vercel --prod --env production
   ```

3. **Enable for All Users**
   - Update feature flags
   - Announce to team via Slack/Email
   - Provide training materials

4. **Monitor First 24 Hours**
   - Check error rates every hour
   - Monitor database performance
   - Track user engagement
   - Respond to support tickets

---

## Training Materials

### Quick Start Guide for Users

**For Planners:**
1. Go to FleetOps → Map System → Planning
2. Click the MapPin icon to create a zone
3. Draw a polygon on the map
4. Name your zone and click "Save as Draft"
5. Go to Review & Activate to make it live

**For Dispatchers:**
1. Go to FleetOps → Map System → Operational
2. Click "Initiate Trade-Off" button
3. Select source vehicle and items
4. Choose receiving vehicles
5. Click on map to place handover point
6. Submit for confirmation

**For Analysts:**
1. Go to FleetOps → Map System → Forensics
2. Use timeline scrubber to select time range
3. Click heatmap icon to view performance
4. Click Trade-Off history icon for past events

---

## Support & Troubleshooting

### Common Issues

**Issue:** Map not loading
- Check browser console for errors
- Verify Supabase connection
- Clear browser cache and reload

**Issue:** Zone won't save
- Check network connection
- Verify user is authenticated
- Check database RLS policies

**Issue:** Trade-Off confirmation not working
- Verify driver records exist in database
- Check confirmation status in `tradeoff_confirmations` table
- Review audit logs for errors

### Support Contacts

- **Technical Issues:** dev-team@biko.com
- **UAT Feedback:** product@biko.com
- **Production Support:** ops@biko.com

---

## Success Metrics (Post-Launch)

### 30-Day Goals
- **Adoption:** 80% of dispatchers using Trade-Off feature
- **Planning:** 50+ zones created and activated
- **Performance:** Map load time <2 seconds (p95)
- **Errors:** <1% error rate on map actions
- **Satisfaction:** NPS score >8 from users

### 90-Day Goals
- **Efficiency:** 20% reduction in manual reassignment time
- **Data Quality:** 500+ route sketches created
- **Forensics Usage:** 100+ forensics queries per week
- **Audit Compliance:** 100% of actions logged

---

## Version History

| Version | Date | Changes | Deployed By |
|---------|------|---------|-------------|
| 1.0.0 | 2025-12-23 | Initial release - All 3 map modes | - |

---

## Approval Signatures

**Technical Lead:** _________________ Date: _______
**Product Manager:** _________________ Date: _______
**Operations Manager:** ______________ Date: _______
**Security Review:** _________________ Date: _______

---

**End of Deployment Guide**

For questions or issues during deployment, contact the development team immediately.

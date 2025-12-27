# Map System Phase 1 - UAT Execution Plan

## 📋 Executive Summary

**Objective:** Deploy Map System Phase 1 to staging, execute comprehensive UAT, and prepare for production deployment

**Timeline:**
- **Week 1:** Staging deployment + UAT execution
- **Week 2:** Monitoring + Production deployment
- **Week 3+:** Phase 2 & Phase 3 parallel development

**Status:** Ready to execute

---

## Week 1: Staging Deployment & UAT

### Day 1: Monday - Staging Deployment

#### Morning (9:00 AM - 12:00 PM)

**Task 1: Database Migration to Staging** (30 min)

```bash
# 1. Connect to staging Supabase project
npx supabase link --project-ref cenugzabuzglswikoewy

# 2. Verify current state
npx supabase db diff

# 3. Push migrations
npx supabase db push

# 4. Verify tables created
psql postgresql://[STAGING_URL] -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'tradeoff%' OR table_name LIKE 'zone%' OR table_name LIKE 'route%';
"
```

**Expected Output:**
```
✓ Applied migration 20251223000001_tradeoff_system.sql
✓ Applied migration 20251223000002_planning_system.sql
✓ 9 tables created
✓ 28 indexes created
✓ RLS policies enabled
```

**Task 2: Verify Database Setup** (30 min)

```sql
-- Run these verification queries

-- 1. Check all tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tradeoffs', 'tradeoff_items', 'tradeoff_confirmations', 'tradeoff_routes',
  'zone_configurations', 'route_sketches', 'facility_assignments',
  'map_action_audit', 'forensics_query_log'
);
-- Expected: 9

-- 2. Verify RLS enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'tradeoff%' OR tablename LIKE 'zone%' OR tablename = 'route_sketches');

-- 3. Check database functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'activate_zone_configuration',
  'get_active_zones',
  'get_workspace_tradeoffs'
);
-- Expected: 3 functions

-- 4. Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'zone%' OR tablename LIKE 'tradeoff%';
-- Expected: 28+ indexes
```

**Task 3: Frontend Build & Deployment** (1 hour)

```bash
# 1. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Run production build
npm run build

# 3. Verify build output
ls -lh dist/assets/ | grep -E '(components-map|pages-fleetops)'

# 4. Deploy to staging (using your deployment method)
# Option A: Vercel
vercel --prod --scope staging

# Option B: Manual
# Upload dist/ folder to staging server
```

**Task 4: Post-Deployment Health Check** (30 min)

Visit staging environment and verify:

**✅ Checklist:**
- [ ] `/fleetops/map/operational` loads without console errors
- [ ] `/fleetops/map/planning` loads without console errors
- [ ] `/fleetops/map/forensics` loads without console errors
- [ ] Map tiles render correctly
- [ ] No network errors in browser DevTools
- [ ] Supabase connection working (check Network tab for API calls)

#### Afternoon (1:00 PM - 5:00 PM)

**Task 5: Create UAT Test Users** (30 min)

```sql
-- Create test users for UAT (if not already existing)
-- Run in Supabase SQL Editor

-- Verify test users exist
SELECT id, email, role FROM auth.users
WHERE email LIKE '%@biko-test.com';

-- If needed, create test users via Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Add users:
--    - planner1@biko-test.com (Operations Manager role)
--    - planner2@biko-test.com (Operations Manager role)
--    - planner3@biko-test.com (Operations Manager role)
--    - dispatcher1@biko-test.com (Dispatcher role)
--    - dispatcher2@biko-test.com (Dispatcher role)
--    - dispatcher3@biko-test.com (Dispatcher role)
--    - dispatcher4@biko-test.com (Dispatcher role)
--    - dispatcher5@biko-test.com (Dispatcher role)
--    - analyst1@biko-test.com (Analyst role)
--    - analyst2@biko-test.com (Analyst role)
```

**Task 6: UAT Kickoff Meeting** (1 hour)

**Attendees:**
- 3 Operations Managers (Planning UAT)
- 5 Dispatchers (Operational UAT)
- 2 Analysts (Forensics UAT)
- 1 Product Manager
- 1 Technical Lead

**Agenda:**
1. Overview of Map System features (15 min)
2. Demo of each mode (20 min)
   - Planning Mode walkthrough
   - Operational Mode Trade-Off demo
   - Forensics Mode analysis demo
3. UAT objectives and success criteria (10 min)
4. Test case assignments (10 min)
5. Q&A (5 min)

**Task 7: Distribute UAT Materials** (30 min)

Send email to UAT participants with:
- Link to staging environment
- Login credentials
- Link to User Guide: `docs/MAP_SYSTEM_USER_GUIDE.md`
- UAT test case spreadsheet (create below)

**Task 8: Create UAT Tracking Spreadsheet** (1 hour)

Create Google Sheet: "Map System Phase 1 UAT Tracking"

**Columns:**
- Test Case ID
- Feature Area (Planning/Operational/Forensics)
- Test Description
- Tester Name
- Status (Not Started/In Progress/Pass/Fail)
- Notes
- Severity (if failed)
- Screenshot/Video Link

---

### Day 2-3: Tuesday-Wednesday - UAT Execution (Planning Mode)

#### Planning Mode Test Cases

**Test Group:** 3 Operations Managers

**Test Case P1: Zone Creation & Draft Workflow**

```
Steps:
1. Log in to staging environment
2. Navigate to FleetOps → Map → Planning
3. Click "Zone Editor" button (MapPin icon)
4. Click on map to draw a polygon (at least 4 points)
5. Double-click to close polygon
6. Enter zone name: "UAT Test Zone - [Your Name]"
7. Enter description: "Created during UAT testing"
8. Click "Save as Draft"

Expected Results:
✅ Polygon draws smoothly on map
✅ Toast notification shows "Zone saved as draft"
✅ Zone appears semi-transparent (indicating draft status)
✅ Browser console has no errors

Database Verification:
Run this query to verify:
SELECT name, active, draft_created_by FROM zone_configurations
WHERE name LIKE 'UAT Test Zone%';

Expected: active = false (draft)
```

**Test Case P2: Facility Assignment**

```
Steps:
1. Click "Facility Assigner" button (Building icon)
2. Use search box to filter facilities by "Lagos"
3. Select 5 facilities using checkboxes
4. Click "Select All" then "Clear Selection" to test bulk operations
5. Re-select 5 facilities individually
6. Choose zone: "UAT Test Zone - [Your Name]"
7. Select assignment type: "Primary"
8. Click "Save Assignments"

Expected Results:
✅ Search filters facilities correctly
✅ Select All/Clear buttons work
✅ Can select individual facilities
✅ Zone dropdown shows your created zone
✅ Save shows success toast
✅ No console errors

Database Verification:
SELECT fa.*, f.name as facility_name, z.name as zone_name
FROM facility_assignments fa
JOIN facilities f ON fa.facility_id = f.id
JOIN zone_configurations z ON fa.zone_configuration_id = z.id
WHERE z.name LIKE 'UAT Test Zone%';

Expected: 5 records with active = false
```

**Test Case P3: Route Sketching**

```
Steps:
1. Click "Route Sketch" button (Route icon)
2. Click on map 5 times to create waypoints
3. Drag the 3rd waypoint to a different location
4. Enter route name: "UAT Route - [Your Name]"
5. Select start facility from dropdown
6. Select end facility from dropdown
7. Verify distance/duration calculations update
8. Click "Save Route Sketch"

Expected Results:
✅ Waypoints appear with correct colors (green start, red end, blue middle)
✅ Line connects waypoints smoothly
✅ Dragging waypoint updates line and distance
✅ Distance shown in kilometers
✅ Duration shown in minutes
✅ Save shows success toast

Database Verification:
SELECT name, active, estimated_distance_km, estimated_duration_minutes
FROM route_sketches
WHERE name LIKE 'UAT Route%';
```

**Test Case P4: Distance Measurement**

```
Steps:
1. Click "Distance Measure" button (Ruler icon)
2. Click on map to create 3 measurement points
3. Verify distance shown after each click
4. Click "Clear" button
5. Create new measurement with 5 points
6. Click "Close" to exit tool

Expected Results:
✅ Lines appear between measurement points
✅ Distance updates after each click
✅ Distance shown in kilometers with 2 decimal places
✅ Clear button removes all points
✅ Close button exits measurement mode
```

**Test Case P5: Planning Review & Activate**

```
Steps:
1. Click "Review & Activate" button (CheckCircle icon)
2. Verify "Zones" tab shows your test zone
3. Switch to "Routes" tab - verify your route sketch
4. Switch to "Assignments" tab - verify your 5 facility assignments
5. Go back to "Zones" tab
6. Check the checkbox next to your zone
7. Click "Activate Selected" button
8. Confirm activation in dialog
9. Verify zone color changes to solid (no longer draft)

Expected Results:
✅ Dialog shows all 3 tabs
✅ Each tab shows your draft items
✅ Conflict detection shows no conflicts
✅ Activation succeeds with success toast
✅ Zone appearance changes after activation

Database Verification:
SELECT name, active, activated_by, activated_at
FROM zone_configurations
WHERE name LIKE 'UAT Test Zone%';

Expected: active = true, activated_at is not null
```

**Success Criteria for Planning UAT:**
- All 5 test cases pass for all 3 testers (15/15 passing)
- No critical bugs blocking workflow
- Users can complete full workflow in <10 minutes
- Average user satisfaction rating >7/10

---

### Day 3-4: Wednesday-Thursday - UAT Execution (Operational Mode)

#### Operational Mode Test Cases

**Test Group:** 5 Dispatchers

**Test Case O1: Trade-Off Initiation**

```
Steps:
1. Log in to staging environment
2. Navigate to FleetOps → Map → Operational
3. Click "Initiate Trade-Off" button
4. In the Trade-Off dialog, select source vehicle from dropdown
5. Add test items:
   - Item 1: "Medical Supplies" - 10 units
   - Item 2: "Vaccines" - 5 boxes
6. Click "Next" to proceed to receiver selection
7. Select 2 receiving vehicles from the list
8. Click "Next" to proceed to handover point
9. Click on map to place handover point
10. Review the summary
11. Click "Submit for Confirmation"

Expected Results:
✅ Dialog opens without errors
✅ Source vehicle dropdown populated
✅ Can add multiple items
✅ Can select multiple receivers
✅ Handover point marker appears on map
✅ Dotted lines drawn from source to handover, and handover to receivers
✅ Summary shows all details
✅ Submit succeeds with success toast

Database Verification:
SELECT
  t.id,
  t.source_vehicle_id,
  t.status,
  t.estimated_time_saved,
  array_agg(ti.item_name) as items
FROM tradeoffs t
LEFT JOIN tradeoff_items ti ON t.id = ti.tradeoff_id
GROUP BY t.id;

Expected: 1 record with status = 'pending_confirmation'
```

**Test Case O2: Multi-Party Confirmation**

```
Steps:
1. After creating Trade-Off in O1, note the Trade-Off ID
2. Query database to get confirmation status:

SELECT
  tc.tradeoff_id,
  tc.party_type,
  tc.party_id,
  tc.confirmed,
  tc.confirmed_at
FROM tradeoff_confirmations tc
WHERE tc.tradeoff_id = '[YOUR_TRADEOFF_ID]';

3. Manually confirm (simulate driver confirmation):

UPDATE tradeoff_confirmations
SET confirmed = true, confirmed_at = NOW()
WHERE tradeoff_id = '[YOUR_TRADEOFF_ID]'
AND party_type = 'driver'
LIMIT 1;

4. Verify Trade-Off status updates to 'confirmed' after both parties confirm

Expected Results:
✅ tradeoff_confirmations has 2 records (1 per driver)
✅ After both confirm, tradeoffs.status = 'confirmed'
✅ Map updates to show confirmed status
```

**Test Case O3: Trade-Off Route Visualization**

```
Steps:
1. After initiating Trade-Off with handover point
2. Verify route visualization on map
3. Click on handover point marker
4. Read popup information
5. Click on dotted route lines
6. Read route popup information

Expected Results:
✅ Dotted lines visible (NOT solid lines)
✅ Lines are amber/orange color
✅ Handover point marker is circular and amber
✅ Popup shows coordinates
✅ Route popups show source/receiver vehicle IDs
✅ Item allocations shown in popup
```

**Test Case O4: Live Vehicle Tracking**

```
Steps:
1. On Operational Map page
2. Observe vehicle markers on map
3. Click on a vehicle marker
4. Verify vehicle details drawer opens
5. Check for real-time position updates (if available)

Expected Results:
✅ Vehicle markers visible on map
✅ Markers have distinct colors/icons
✅ Clicking marker opens drawer
✅ Drawer shows vehicle details
```

**Test Case O5: Exception Handling**

```
Steps:
1. Try to create Trade-Off with source vehicle that has no items
2. Try to submit Trade-Off without selecting receivers
3. Try to submit without placing handover point
4. Try to create Trade-Off while offline (disconnect network)

Expected Results:
✅ Clear error message for vehicle with no items
✅ "Next" button disabled until receivers selected
✅ "Submit" button disabled until handover point placed
✅ Offline error handled gracefully with retry option
```

**Success Criteria for Operational UAT:**
- All 5 test cases pass for all 5 testers (25/25 passing)
- Trade-Off workflow completes in <2 minutes
- No data corruption during multi-party confirmation
- Users report workflow is intuitive

---

### Day 4-5: Thursday-Friday - UAT Execution (Forensics Mode)

#### Forensics Mode Test Cases

**Test Group:** 2 Analysts

**Test Case F1: Route Comparison**

```
Steps:
1. Navigate to FleetOps → Map → Forensics
2. Click "Route Comparison" button
3. Select a completed delivery from dropdown
4. Verify planned vs actual route overlay appears
5. Check metrics comparison panel

Expected Results:
✅ Both routes visible (planned = blue, actual = green)
✅ Deviation areas highlighted
✅ Metrics panel shows distance, duration, fuel cost
✅ Deviation percentage calculated
```

**Test Case F2: Performance Heatmap**

```
Steps:
1. Click "Performance Heatmap" button
2. Select metric: "On-Time Delivery Rate"
3. Verify heatmap renders on map
4. Change metric to "Delay Hotspots"
5. Verify color coding changes
6. Select metric: "Exception Frequency"

Expected Results:
✅ Circle markers appear on map
✅ Color gradient: green (good) → yellow → red (bad)
✅ Marker size indicates magnitude
✅ Clicking marker shows details popup
✅ Metric changes update visualization instantly
```

**Test Case F3: Trade-Off History**

```
Steps:
1. Click "Trade-Off History" button
2. Select time range: "Last 7 Days"
3. Filter by status: "All"
4. Verify historical Trade-Off markers appear
5. Click on a Trade-Off marker
6. Read details in popup
7. Change filter to "Completed" only

Expected Results:
✅ Historical Trade-Off handover points visible
✅ Markers color-coded by status
✅ Popup shows source/receiver vehicles, items, outcome
✅ Filter updates visualization
✅ Time saved metrics displayed
```

**Test Case F4: Timeline Playback** (if implemented)

```
Steps:
1. Select timeline scrubber at bottom
2. Set time range to 6 hours ago
3. Click play button
4. Observe vehicle positions update
5. Pause playback
6. Scrub timeline manually

Expected Results:
✅ Scrubber control visible
✅ Play/pause buttons work
✅ Vehicle positions update smoothly
✅ Manual scrubbing works
✅ Time display updates
```

**Success Criteria for Forensics UAT:**
- All test cases pass for both analysts
- Heatmap renders in <3 seconds
- Historical data accurately reflects test data
- Analysts can extract insights in <5 minutes

---

### Day 5: Friday - UAT Results Review

**Morning: Consolidate Feedback** (2 hours)

1. **Review UAT Tracking Spreadsheet**
   - Count Pass/Fail for each test case
   - Categorize bugs by severity:
     - 🔴 Critical: Blocks core workflow
     - 🟡 Major: Significant but workaround exists
     - 🟢 Minor: Cosmetic or edge case

2. **Create Bug Tickets**
   - For each failed test case, create GitHub issue
   - Assign priority labels
   - Assign to development team

3. **Compile UAT Metrics**
   ```
   Total Test Cases: 15 (Planning) + 5 (Operational) + 4 (Forensics) = 24
   Passed: [COUNT]
   Failed: [COUNT]
   Pass Rate: [PERCENTAGE]%

   User Satisfaction Scores:
   - Planning Mode: [AVG SCORE]/10
   - Operational Mode: [AVG SCORE]/10
   - Forensics Mode: [AVG SCORE]/10

   Critical Bugs: [COUNT]
   Major Bugs: [COUNT]
   Minor Bugs: [COUNT]
   ```

**Afternoon: UAT Closeout Meeting** (1 hour)

**Attendees:**
- All UAT participants
- Product Manager
- Technical Lead
- Stakeholders

**Agenda:**
1. Present UAT results (15 min)
2. Demo bug fixes (if any quick fixes done) (15 min)
3. Discuss critical feedback (20 min)
4. Production deployment decision (10 min)

**Go/No-Go Decision Criteria:**
- ✅ Pass rate >90%
- ✅ Zero critical bugs
- ✅ Major bugs have known workarounds
- ✅ User satisfaction >7/10
- ✅ Stakeholder approval

---

## Week 2: Monitoring & Production Deployment

### Day 6-10: Monday-Friday - Staging Monitoring

**Daily Tasks:**

**Morning (9:00 AM):**
- Check error logs in Supabase
- Review monitoring dashboard
- Check for new bug reports

```sql
-- Daily monitoring query
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE success = false) as errors
FROM map_action_audit
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);
```

**Afternoon (2:00 PM):**
- Review UAT participant feedback
- Fix minor bugs (if any)
- Update documentation based on feedback

**Key Metrics to Track:**

```typescript
{
  // Performance
  map_load_time_p95: number,  // Target: <2000ms
  zone_save_duration_p95: number,  // Target: <1000ms

  // Usage
  daily_active_users: number,  // Target: >8 (UAT participants)
  zones_created: number,  // Target: >10
  tradeoffs_initiated: number,  // Target: >5

  // Errors
  error_rate: number,  // Target: <1%
  critical_errors: number,  // Target: 0
}
```

**Red Flags to Watch:**
- ❌ Error rate >5%
- ❌ Map load time >3 seconds
- ❌ Database connection failures
- ❌ Multiple users reporting same issue
- ❌ Data corruption in database

### Day 11: Friday - Production Deployment Decision

**Go/No-Go Meeting** (1 hour)

**Review Checklist:**
- [ ] All UAT test cases passing
- [ ] Zero critical bugs outstanding
- [ ] Staging stable for 1 week
- [ ] Performance metrics within targets
- [ ] User feedback positive
- [ ] Stakeholder approval obtained
- [ ] Rollback plan documented
- [ ] Support team trained

**If GO:**
- Schedule production deployment for next Monday
- Send announcement email to all users
- Prepare monitoring dashboards

**If NO-GO:**
- Document blockers
- Create action plan to resolve
- Reschedule deployment

---

## Production Deployment

### Pre-Deployment (Sunday evening)

**Task 1: Final Staging Verification** (30 min)

```bash
# Run final smoke tests on staging
npm run test:e2e -- --env=staging

# Verify database state
psql $STAGING_DB_URL -c "
SELECT
  COUNT(*) as total_zones,
  COUNT(*) FILTER (WHERE active = true) as active_zones,
  COUNT(*) FILTER (WHERE active = false) as draft_zones
FROM zone_configurations;
"
```

**Task 2: Production Database Backup** (15 min)

```bash
# Backup production database before migration
npx supabase db dump -f backup-pre-map-system-$(date +%Y%m%d).sql

# Verify backup file created
ls -lh backup-pre-map-system-*.sql
```

### Deployment Day (Monday)

**Early Morning (6:00 AM - Low Traffic Time)**

**Step 1: Database Migration** (30 min)

```bash
# Connect to production
npx supabase link --project-ref YOUR_PROD_PROJECT_REF

# Verify migration files
ls -l supabase/migrations/2025122300000*.sql

# Apply migrations
npx supabase db push

# Verify
npx supabase db diff
# Should show: "No schema changes detected"
```

**Step 2: Deploy Frontend** (30 min)

```bash
# Production build
npm ci
npm run build

# Deploy
vercel --prod --env production

# Verify deployment
curl https://your-production-domain.com/health
```

**Step 3: Smoke Tests** (15 min)

Visit production and verify:
- [ ] All 3 map pages load
- [ ] No console errors
- [ ] Database connection working
- [ ] Map tiles rendering

**Step 4: Enable Feature Flags** (5 min)

```bash
# Update environment variables
VITE_ENABLE_MAP_SYSTEM=true
VITE_ENABLE_TRADE_OFFS=true
VITE_ENABLE_PLANNING_MODE=true
VITE_ENABLE_FORENSICS_MODE=true
```

**Step 5: Announcement** (15 min)

Send email to all users:

```
Subject: 🗺️ New Map System Now Live!

Hi Team,

We're excited to announce that our new Map System is now live in production!

What's New:
✅ Planning Mode - Create zones, sketch routes, assign facilities
✅ Operational Mode - Manage Trade-Offs with visual workflow
✅ Forensics Mode - Analyze historical performance

Getting Started:
1. Go to FleetOps → Map System
2. Choose your mode (Planning/Operational/Forensics)
3. Check out the User Guide: [LINK]

Training Session:
- Date: Tuesday, 2:00 PM
- Location: Conference Room A
- Duration: 1 hour

Questions? Contact: support@biko.com

Happy Mapping!
The Biko Team
```

### Post-Deployment Monitoring (Week 1)

**First 24 Hours:**
- Check errors every 2 hours
- Monitor Slack #support channel
- Track user engagement
- Be ready for hotfixes

**Daily for Week 1:**
```sql
-- Run this query daily
SELECT
  DATE(created_at) as date,
  COUNT(*) as actions,
  COUNT(DISTINCT user_id) as users,
  action_type,
  COUNT(*) FILTER (WHERE success = false) as errors
FROM map_action_audit
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at), action_type
ORDER BY actions DESC;
```

**Success Metrics (Week 1):**
- 50% of operations team using Planning Mode
- 10+ zones created and activated
- 5+ Trade-Offs initiated
- <0.5% error rate
- No critical production incidents

---

## Phase 2 & Phase 3 Preparation

### Week 3: Parallel Development Begins

**Phase 2 Team (2-3 developers):**
- Start: Zone Conflict Analyzer
- Research: PostGIS geometric functions
- Design: Conflict resolution UI
- Estimate: 3-4 days development

**Phase 3 Team (2-3 developers):**
- Start: WebSocket infrastructure
- Research: Supabase real-time subscriptions
- Design: Live vehicle tracking architecture
- Estimate: 5-6 days development

**Coordination:**
- Daily standup to sync progress
- Shared GitHub project board
- Weekly demo to stakeholders

---

## Appendix

### A. UAT Tester Credentials

Create and distribute:

| Email | Role | Mode Access |
|-------|------|-------------|
| planner1@biko-test.com | Operations Manager | Planning |
| planner2@biko-test.com | Operations Manager | Planning |
| planner3@biko-test.com | Operations Manager | Planning |
| dispatcher1@biko-test.com | Dispatcher | Operational |
| dispatcher2@biko-test.com | Dispatcher | Operational |
| dispatcher3@biko-test.com | Dispatcher | Operational |
| dispatcher4@biko-test.com | Dispatcher | Operational |
| dispatcher5@biko-test.com | Dispatcher | Operational |
| analyst1@biko-test.com | Analyst | Forensics |
| analyst2@biko-test.com | Analyst | Forensics |

### B. Emergency Contacts

- **Technical Lead:** [Name/Phone/Email]
- **Product Manager:** [Name/Phone/Email]
- **DevOps:** [Name/Phone/Email]
- **Supabase Support:** support@supabase.io

### C. Rollback Procedures

**If Critical Bug Found in Production:**

1. **Immediate Response** (5 min)
   ```bash
   # Disable feature flags
   vercel env rm VITE_ENABLE_MAP_SYSTEM production
   vercel --prod
   ```

2. **Database Rollback** (15 min)
   ```bash
   # Restore backup
   psql $PROD_DB_URL < backup-pre-map-system-YYYYMMDD.sql
   ```

3. **Code Rollback** (10 min)
   ```bash
   git revert HEAD~5..HEAD
   npm run build
   vercel --prod
   ```

4. **Communication** (immediate)
   - Notify all users via email/Slack
   - Update status page
   - Schedule postmortem

---

**Document Version:** 1.0
**Last Updated:** 2025-12-24
**Status:** Ready for Execution

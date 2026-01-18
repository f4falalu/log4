# BIKO Map System - Production Deployment Guide

**Version**: 1.0
**Date**: 2026-01-05
**Target Environment**: Production (Netlify + Supabase)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Migrations](#database-migrations)
4. [Build Process](#build-process)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)
- [ ] ESLint passing (`npm run lint`)
- [ ] No console errors or warnings in development
- [ ] Load tests completed successfully (`npm run test:map-load`)
- [ ] Code reviewed and approved (PR merged to main)

### Database Readiness
- [ ] All migrations applied to staging environment
- [ ] Migration SQL files reviewed and tested
- [ ] Backup of production database created
- [ ] Database indexes optimized
- [ ] RLS policies verified

### Environment Variables
- [ ] All required environment variables documented
- [ ] Production environment variables configured in Netlify
- [ ] Supabase project URL and anon key verified
- [ ] Feature flags configured correctly
- [ ] API keys and secrets rotated if needed

### Dependencies
- [ ] All dependencies up to date
- [ ] Security audit passed (`npm audit`)
- [ ] Bundle size analyzed and optimized
- [ ] No deprecated packages

---

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Feature Flags
VITE_ENABLE_MAPLIBRE_MAPS=true  # Enable MapLibre (set to false to use Leaflet fallback)
VITE_ENABLE_INTELLIGENCE=true   # Enable Phase 7 intelligence features
VITE_ENABLE_ANALYTICS=true      # Enable Phase 8 analytics tracking

# Map Configuration
VITE_DEFAULT_MAP_CENTER_LAT=9.082
VITE_DEFAULT_MAP_CENTER_LNG=8.6753
VITE_DEFAULT_MAP_ZOOM=6

# Performance Configuration
VITE_MAX_MARKERS_PER_LAYER=1000
VITE_UPDATE_INTERVAL_MS=5000
VITE_BATCH_SIZE=50

# Analytics
VITE_ANALYTICS_ENDPOINT=https://your-analytics-endpoint.com
VITE_ANALYTICS_ENABLED=true

# PWA Configuration
VITE_PWA_ENABLED=true
VITE_PWA_CACHE_VERSION=v1
```

### Netlify Environment Variables

In Netlify dashboard (Site Settings → Environment Variables), add:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENABLE_MAPLIBRE_MAPS
VITE_ENABLE_INTELLIGENCE
VITE_ENABLE_ANALYTICS
```

---

## Database Migrations

### Migration Order (CRITICAL)

Migrations must be applied in this exact order:

1. **Phase 5: Handoffs Governance**
   ```bash
   supabase/migrations/20260105000001_enhance_handoffs_governance.sql
   ```
   - Adds governance fields to `handoffs` table
   - Enforces system-proposed-only constraint
   - **CRITICAL**: Backup handoffs table before applying

2. **Phase 7: Intelligence Infrastructure** (if VITE_ENABLE_INTELLIGENCE=true)
   ```bash
   supabase/migrations/20260105000002_knowledge_graph_tables.sql
   supabase/migrations/20260105000003_intelligence_functions.sql
   ```
   - Creates knowledge graph tables
   - Adds RPC functions for pattern recognition

3. **Phase 8: Analytics & Governance** (if VITE_ENABLE_ANALYTICS=true)
   ```bash
   supabase/migrations/20260105000004_map_analytics_tables.sql
   supabase/migrations/20260105000005_analytics_functions.sql
   ```
   - Creates analytics tracking tables
   - Adds RPC functions for statistics

### Migration Command

```bash
# Apply all migrations
npx supabase db push

# Or apply specific migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/FILENAME.sql
```

### Verification

```sql
-- Verify handoffs governance constraint
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'handoffs'::regclass
AND conname = 'handoffs_system_only';
-- Should return: CHECK (proposed_by = 'system')

-- Verify knowledge graph tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_graph_nodes', 'knowledge_graph_relationships');

-- Verify analytics tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('map_interaction_events', 'map_analytics_sessions', 'map_access_log');
```

---

## Build Process

### 1. Install Dependencies

```bash
npm ci --production
```

### 2. Run Build

```bash
npm run build
```

This will:
- Compile TypeScript
- Bundle with Vite
- Generate PWA service worker
- Optimize assets
- Output to `dist/` directory

### 3. Verify Build

```bash
# Check bundle size
ls -lh dist/assets/*.js

# Preview build locally
npm run preview
```

**Expected Bundle Sizes**:
- Main JS: < 500 KB (gzipped)
- Vendor JS: < 1 MB (gzipped)
- CSS: < 100 KB (gzipped)

---

## Deployment Steps

### Option A: Netlify CLI Deployment

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist
```

### Option B: GitHub Integration (Recommended)

1. Push code to `main` branch
2. Netlify auto-deploys via GitHub integration
3. Monitor deploy logs in Netlify dashboard

### Post-Build Commands (Netlify)

In `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=86400"
```

---

## Post-Deployment Verification

### 1. Smoke Tests

**Critical Paths**:
```bash
# Planning Map
✓ Navigate to /fleetops/map/planning
✓ Verify facilities render
✓ Draw a zone (if user has permission)
✓ Check no console errors

# Operational Map
✓ Navigate to /fleetops/map/operational
✓ Verify vehicles render with real-time updates
✓ Check trade-off approval UI (if user is dispatcher)
✓ Verify KPI ribbon displays stats

# Forensic Map
✓ Navigate to /fleetops/map/forensics
✓ Verify heatmap renders
✓ Test timeline playback
✓ Export data (PNG, GeoJSON, CSV)
```

### 2. Performance Checks

```bash
# Run Lighthouse audit
npx lighthouse https://your-site.netlify.app --view

# Target Scores:
Performance: ≥90
Accessibility: ≥95
Best Practices: ≥95
SEO: ≥90
PWA: ≥90
```

### 3. Feature Flag Verification

```javascript
// In browser console
console.log(import.meta.env.VITE_ENABLE_MAPLIBRE_MAPS); // Should be 'true'
console.log(import.meta.env.VITE_ENABLE_INTELLIGENCE); // Should be 'true'
console.log(import.meta.env.VITE_ENABLE_ANALYTICS); // Should be 'true'
```

### 4. Database Connection Test

```javascript
// In browser console
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('vehicles').select('count');
console.log('Vehicle count:', data, error); // Should return count, no error
```

### 5. Real-Time Updates Test

1. Open operational map in two browser windows
2. Make a change in one window (e.g., approve trade-off)
3. Verify change appears in other window within 5 seconds

### 6. Analytics Verification

```sql
-- Check analytics events are being logged
SELECT COUNT(*), event_type
FROM map_interaction_events
WHERE timestamp > NOW() - INTERVAL '10 minutes'
GROUP BY event_type;
-- Should show recent events (map_view, click, zoom, etc.)
```

---

## Rollback Procedure

### Immediate Rollback (< 5 minutes)

**If critical issues detected**:

```bash
# Netlify CLI rollback to previous deployment
netlify rollback

# Or via Netlify dashboard:
# 1. Go to Deploys
# 2. Find last known good deployment
# 3. Click "Publish deploy"
```

### Database Rollback

**If migration caused issues**:

```bash
# Restore from backup
pg_restore -h your-db-host -U postgres -d postgres backup.dump

# Or revert specific migration
psql -h your-db-host -U postgres -d postgres -c "
  ALTER TABLE handoffs DROP CONSTRAINT IF EXISTS handoffs_system_only;
  ALTER TABLE handoffs DROP COLUMN IF EXISTS proposed_by;
  -- etc.
"
```

**CRITICAL**: Always test rollback procedure in staging first.

---

## Monitoring & Alerts

### Metrics to Monitor

**Application Metrics**:
- Map load time (target: < 3s)
- Average FPS (target: ≥50)
- Error rate (target: < 0.1%)
- API response time (target: < 500ms)

**Infrastructure Metrics**:
- Netlify build time (target: < 5 min)
- Supabase connection count
- Database CPU usage
- API rate limits

### Alert Thresholds

**Critical Alerts** (immediate action):
- Error rate > 1%
- Map load time > 5s
- Database connection failures
- API rate limit exceeded

**Warning Alerts** (investigate within 1 hour):
- Error rate > 0.5%
- Map load time > 4s
- FPS drops below 40
- Memory usage > 80%

### Recommended Tools

- **Error Tracking**: Sentry
- **Performance Monitoring**: New Relic or Datadog
- **Uptime Monitoring**: Pingdom or UptimeRobot
- **Log Aggregation**: Logtail or Papertrail

---

## Troubleshooting

### Issue: Map Not Loading

**Symptoms**: Blank screen, "Loading..." never completes

**Diagnosis**:
```javascript
// Check console for errors
// Common issues:
// - Invalid Supabase credentials
// - CORS errors
// - Network connectivity
```

**Resolution**:
1. Verify environment variables
2. Check Supabase project status
3. Clear browser cache
4. Verify RLS policies allow data access

---

### Issue: Real-Time Updates Not Working

**Symptoms**: Map shows stale data, updates don't appear

**Diagnosis**:
```sql
-- Check realtime is enabled
SELECT
  schemaname,
  tablename,
  objsubid,
  classid
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- Should include: vehicles, drivers, delivery_batches
```

**Resolution**:
1. Verify Supabase realtime is enabled for tables
2. Check WebSocket connection in Network tab
3. Verify RLS policies allow SELECT on subscribed tables

---

### Issue: Trade-Off Approval Fails

**Symptoms**: "Governance Violation" error when approving trade-off

**Diagnosis**:
```sql
-- Check handoff record
SELECT proposed_by, status
FROM handoffs
WHERE id = 'handoff-id-here';
```

**Resolution**:
1. Verify `proposed_by = 'system'` (not manual)
2. Check user has 'dispatcher' or 'admin' role
3. Verify RLS policy allows UPDATE

---

### Issue: High Memory Usage

**Symptoms**: Browser tab crashes, slow performance

**Diagnosis**:
```javascript
// Check marker count
console.log(map.queryRenderedFeatures().length);
// Target: < 1000 markers per layer
```

**Resolution**:
1. Enable clustering for high-density layers
2. Reduce update frequency
3. Clear old features from memory
4. Check for memory leaks in custom layers

---

### Issue: Export Functions Not Working

**Symptoms**: Export buttons do nothing, no download

**Diagnosis**:
```javascript
// Check browser console for errors
// Common issues:
// - Blob API not supported
// - Download blocked by browser
```

**Resolution**:
1. Implement export functions (currently TODOs)
2. Test in different browsers
3. Check Content Security Policy (CSP) headers

---

## Performance Optimization Checklist

### Before Deployment
- [ ] Bundle size analyzed with `npm run build -- --analyze`
- [ ] Lazy loading for route-based code splitting
- [ ] Image assets optimized (WebP format)
- [ ] Unused dependencies removed
- [ ] Tree-shaking verified for MapLibre

### After Deployment
- [ ] CDN caching configured (assets, tiles)
- [ ] Gzip/Brotli compression enabled
- [ ] Service worker caching strategy tested
- [ ] Critical CSS inlined
- [ ] Font loading optimized (font-display: swap)

---

## Security Checklist

### Pre-Deployment
- [ ] No secrets in client-side code
- [ ] RLS policies tested and verified
- [ ] API keys rotated (if compromised)
- [ ] CORS configured correctly
- [ ] CSP headers configured

### Post-Deployment
- [ ] Security headers verified (helmet.js)
- [ ] HTTPS enforced (no HTTP access)
- [ ] Supabase audit logs reviewed
- [ ] Failed login attempts monitored

---

## Maintenance Windows

**Recommended Deployment Times**:
- **Weekdays**: 2 AM - 4 AM (local time, low traffic)
- **Weekends**: Any time (even lower traffic)

**Avoid Deploying**:
- During business hours (8 AM - 6 PM)
- On Mondays (highest support ticket volume)
- Before major holidays

---

## Support Contacts

**Development Team**:
- Lead Developer: [Your Name]
- DevOps: [DevOps Contact]
- Database Admin: [DBA Contact]

**Infrastructure**:
- Netlify Support: support@netlify.com
- Supabase Support: support@supabase.com

**Emergency Escalation**:
- Critical issues: [Emergency Phone/Slack]
- After-hours: [On-Call Rotation]

---

## Changelog

### Version 1.0 (2026-01-05)
- Initial production deployment
- Phases 1-6 complete (MapLibre migration)
- Phase 7 complete (Intelligence features)
- Phase 8 complete (Governance & scale)
- Feature flags: MapLibre enabled by default
- PWA support: Offline maps + background sync

---

## Appendix

### A. Database Schema Changes

See migration files in `supabase/migrations/` for full schema.

**Key Tables Added**:
- `knowledge_graph_nodes`
- `knowledge_graph_relationships`
- `map_interaction_events`
- `map_analytics_sessions`
- `map_access_log`
- `map_performance_metrics`

### B. API Endpoints

**Supabase RPC Functions**:
- `get_route_segment_performance(p_days_back)`
- `get_driver_performance_metrics(p_days_back)`
- `get_demand_patterns(p_days_back)`
- `get_seasonal_factors()`
- `analyze_recurring_delays(p_days_back, p_min_occurrences)`
- `analyze_route_efficiency(p_days_back)`
- `analyze_driver_consistency(p_days_back)`
- `analyze_demand_surges(p_days_back)`
- `get_feature_usage_stats()`
- `get_user_behavior_pattern(p_user_id)`
- `get_interaction_heatmap(p_map_mode, p_start_date, p_end_date)`

### C. Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `VITE_ENABLE_MAPLIBRE_MAPS` | `true` | Use MapLibre instead of Leaflet |
| `VITE_ENABLE_INTELLIGENCE` | `true` | Enable Phase 7 intelligence features |
| `VITE_ENABLE_ANALYTICS` | `true` | Enable Phase 8 analytics tracking |
| `VITE_PWA_ENABLED` | `true` | Enable PWA offline support |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Next Review**: 2026-02-05

---

*For questions or issues, contact the development team or file an issue in the project repository.*

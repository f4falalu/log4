-- ============================================================================
-- Analytics Deployment Verification Script
-- Run this in Supabase SQL Editor to verify all analytics objects exist
-- ============================================================================

-- 1. Check analytics schema exists
SELECT 'Analytics Schema' as check_name,
       EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'analytics') as exists;

-- 2. List all materialized views in analytics schema
SELECT 'Materialized Views' as check_name, matviewname as object_name,
       pg_size_pretty(pg_total_relation_size('analytics.' || matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'analytics'
ORDER BY matviewname;

-- 3. Check for analytics functions in public schema
SELECT 'Analytics Functions' as check_name, routine_name as object_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE 'get_%analytics' OR routine_name LIKE 'get_kpis')
ORDER BY routine_name;

-- 4. Count records in each materialized view
SELECT 'delivery_performance' as view_name, COUNT(*) as record_count
FROM analytics.delivery_performance
UNION ALL
SELECT 'driver_efficiency', COUNT(*) FROM analytics.driver_efficiency
UNION ALL
SELECT 'vehicle_utilization', COUNT(*) FROM analytics.vehicle_utilization
UNION ALL
SELECT 'cost_analysis', COUNT(*) FROM analytics.cost_analysis;

-- 5. Test a simple KPI query (if get_kpis function exists)
-- SELECT * FROM public.get_kpis(
--   (SELECT id FROM workspaces LIMIT 1)::uuid,
--   NOW() - INTERVAL '30 days',
--   NOW()
-- ) LIMIT 5;

-- 6. Sample data from delivery_performance
SELECT
  batch_id,
  scheduled_date,
  status,
  vehicle_number,
  driver_name,
  facilities_count,
  on_time
FROM analytics.delivery_performance
ORDER BY scheduled_date DESC
LIMIT 5;

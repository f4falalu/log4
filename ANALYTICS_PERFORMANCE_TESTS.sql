/**
 * Analytics Performance Benchmark Tests
 * Phase 2 Week 2 - Ticket A10
 *
 * Purpose: Verify all analytics queries meet < 100ms performance target
 * Run these queries in Supabase SQL Editor with \timing on
 *
 * Target Performance:
 * - Materialized Views: < 50ms
 * - KPI Functions: < 100ms
 * - Dashboard Summary: < 100ms
 */

-- Enable query timing
\timing on

-- ============================================================================
-- SECTION 1: MATERIALIZED VIEW PERFORMANCE TESTS
-- Target: < 50ms per query
-- ============================================================================

-- Test 1.1: Delivery Performance View
-- Expected: ~20ms
SELECT COUNT(*) FROM public.mv_delivery_performance;

SELECT * FROM public.mv_delivery_performance LIMIT 10;

-- Test 1.2: Driver Efficiency View
-- Expected: ~25ms
SELECT COUNT(*) FROM public.mv_driver_efficiency;

SELECT * FROM public.mv_driver_efficiency LIMIT 10;

-- Test 1.3: Vehicle Utilization View
-- Expected: ~30ms
SELECT COUNT(*) FROM public.mv_vehicle_utilization;

SELECT * FROM public.mv_vehicle_utilization LIMIT 10;

-- Test 1.4: Cost Analysis View
-- Expected: ~35ms
SELECT COUNT(*) FROM public.mv_cost_analysis;

SELECT * FROM public.mv_cost_analysis LIMIT 10;

-- ============================================================================
-- SECTION 2: KPI FUNCTION PERFORMANCE TESTS
-- Target: < 100ms per function
-- ============================================================================

-- Test 2.1: Delivery KPIs (No Date Filter)
-- Expected: ~40ms
SELECT * FROM public.get_delivery_kpis(NULL, NULL);

-- Test 2.2: Delivery KPIs (With Date Range)
-- Expected: ~45ms
SELECT * FROM public.get_delivery_kpis('2025-01-01', '2025-12-31');

-- Test 2.3: Top Vehicles by On-Time Rate
-- Expected: ~35ms
SELECT * FROM public.get_top_vehicles_by_ontime(10);

-- Test 2.4: Driver KPIs
-- Expected: ~45ms
SELECT * FROM public.get_driver_kpis();

-- Test 2.5: Top Drivers (On-Time Rate)
-- Expected: ~40ms
SELECT * FROM public.get_top_drivers('on_time_rate', 10);

-- Test 2.6: Top Drivers (Fuel Efficiency)
-- Expected: ~40ms
SELECT * FROM public.get_top_drivers('fuel_efficiency', 10);

-- Test 2.7: Top Drivers (Total Deliveries)
-- Expected: ~40ms
SELECT * FROM public.get_top_drivers('deliveries', 10);

-- Test 2.8: Vehicle KPIs
-- Expected: ~50ms
SELECT * FROM public.get_vehicle_kpis();

-- Test 2.9: Vehicles Needing Maintenance
-- Expected: ~45ms
SELECT * FROM public.get_vehicles_needing_maintenance();

-- Test 2.10: Cost KPIs
-- Expected: ~55ms
SELECT * FROM public.get_cost_kpis();

-- Test 2.11: Vehicle Cost Breakdown
-- Expected: ~50ms
SELECT * FROM public.get_vehicle_costs(10);

-- Test 2.12: Driver Cost Breakdown
-- Expected: ~50ms
SELECT * FROM public.get_driver_costs(10);

-- ============================================================================
-- SECTION 3: DASHBOARD SUMMARY PERFORMANCE TEST
-- Target: < 100ms (Most Important!)
-- ============================================================================

-- Test 3.1: Complete Dashboard Summary (No Date Filter)
-- Expected: ~75ms
-- This is the MOST CRITICAL query - used by main dashboard
SELECT * FROM public.get_dashboard_summary(NULL, NULL);

-- Test 3.2: Complete Dashboard Summary (With Date Range)
-- Expected: ~80ms
SELECT * FROM public.get_dashboard_summary('2025-01-01', '2025-12-31');

-- ============================================================================
-- SECTION 4: MATERIALIZED VIEW REFRESH PERFORMANCE
-- Target: < 5 seconds for full refresh
-- ============================================================================

-- Test 4.1: Refresh Delivery Performance View
-- Expected: < 2 seconds
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_delivery_performance;

-- Test 4.2: Refresh Driver Efficiency View
-- Expected: < 2 seconds
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_driver_efficiency;

-- Test 4.3: Refresh Vehicle Utilization View
-- Expected: < 2 seconds
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_vehicle_utilization;

-- Test 4.4: Refresh Cost Analysis View
-- Expected: < 2 seconds
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cost_analysis;

-- ============================================================================
-- SECTION 5: VIEW SIZE AND STATISTICS
-- ============================================================================

-- Test 5.1: Check Materialized View Sizes
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size,
  pg_total_relation_size(schemaname||'.'||matviewname) AS size_bytes
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE 'mv_%'
ORDER BY size_bytes DESC;

-- Test 5.2: Check Last Refresh Times
SELECT
  schemaname,
  matviewname,
  last_refresh,
  EXTRACT(EPOCH FROM (NOW() - last_refresh)) AS seconds_since_refresh
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE 'mv_%'
ORDER BY last_refresh DESC;

-- Test 5.3: Check Row Counts
SELECT 'mv_delivery_performance' AS view_name, COUNT(*) AS row_count FROM public.mv_delivery_performance
UNION ALL
SELECT 'mv_driver_efficiency', COUNT(*) FROM public.mv_driver_efficiency
UNION ALL
SELECT 'mv_vehicle_utilization', COUNT(*) FROM public.mv_vehicle_utilization
UNION ALL
SELECT 'mv_cost_analysis', COUNT(*) FROM public.mv_cost_analysis;

-- ============================================================================
-- SECTION 6: SYSTEM SETTINGS PERFORMANCE
-- ============================================================================

-- Test 6.1: Query System Settings
-- Expected: < 10ms
SELECT * FROM public.system_settings WHERE category = 'cost';

-- Test 6.2: Update System Setting (Admin Only)
-- Expected: < 20ms + auto-refresh of mv_cost_analysis
-- NOTE: Only run if you have system_admin role
-- UPDATE public.system_settings
-- SET setting_value = 1.75
-- WHERE setting_key = 'fuel_price_per_liter';

-- ============================================================================
-- SECTION 7: STRESS TEST - PARALLEL QUERIES
-- Simulates dashboard loading all KPIs simultaneously
-- ============================================================================

-- Test 7.1: Parallel KPI Fetch (Simulates Frontend Dashboard Load)
-- Run these queries in parallel to simulate real-world dashboard behavior
-- Expected: All complete within ~100ms window

BEGIN;
SELECT * FROM public.get_delivery_kpis(NULL, NULL);
SELECT * FROM public.get_driver_kpis();
SELECT * FROM public.get_vehicle_kpis();
SELECT * FROM public.get_cost_kpis();
COMMIT;

-- ============================================================================
-- SECTION 8: INDEX VERIFICATION
-- Verify all necessary indexes exist for optimal performance
-- ============================================================================

-- Test 8.1: Check Indexes on Source Tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('delivery_batches', 'drivers', 'vehicles', 'vehicle_tracking', 'maintenance_records')
ORDER BY tablename, indexname;

-- Test 8.2: Check Indexes on Materialized Views
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'mv_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 9: QUERY PLAN ANALYSIS
-- Use EXPLAIN ANALYZE to verify query execution plans
-- ============================================================================

-- Test 9.1: Analyze Dashboard Summary Query Plan
EXPLAIN ANALYZE
SELECT * FROM public.get_dashboard_summary(NULL, NULL);

-- Test 9.2: Analyze Delivery KPIs Query Plan
EXPLAIN ANALYZE
SELECT * FROM public.get_delivery_kpis(NULL, NULL);

-- Test 9.3: Analyze Cost Analysis View Query Plan
EXPLAIN ANALYZE
SELECT * FROM public.mv_cost_analysis LIMIT 100;

-- ============================================================================
-- SECTION 10: TRIGGER PERFORMANCE TEST
-- Verify auto-refresh triggers execute quickly
-- ============================================================================

-- Test 10.1: Insert Test Batch (Triggers Delivery View Refresh)
-- Expected: < 100ms including trigger execution
-- NOTE: This is a test insert - remove if you don't want test data
/*
INSERT INTO public.delivery_batches (
  name,
  status,
  priority,
  scheduled_date,
  warehouse_id
) VALUES (
  'TEST-BATCH-PERFORMANCE',
  'planned',
  'medium',
  NOW(),
  (SELECT id FROM warehouses LIMIT 1)
) RETURNING id;

-- Clean up test data
DELETE FROM public.delivery_batches WHERE name = 'TEST-BATCH-PERFORMANCE';
*/

-- ============================================================================
-- SECTION 11: CACHE EFFICIENCY TEST
-- Verify React Query caching reduces database load
-- ============================================================================

-- Test 11.1: Monitor Active Connections During Dashboard Load
SELECT
  datname AS database_name,
  count(*) AS active_connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname;

-- Test 11.2: Check Query Cache Hit Ratio
SELECT
  sum(heap_blks_read) AS heap_read,
  sum(heap_blks_hit) AS heap_hit,
  CASE
    WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
    ELSE round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
  END AS cache_hit_ratio
FROM pg_statio_user_tables;

-- ============================================================================
-- BENCHMARK RESULTS TEMPLATE
-- ============================================================================

/**
 * PERFORMANCE BENCHMARK RESULTS
 * Date: 2025-12-26
 * Environment: Production/Staging/Development
 * Data Size: [Record counts for source tables]
 *
 * SECTION 1: MATERIALIZED VIEWS
 * - mv_delivery_performance: ___ms  [Target: < 50ms]
 * - mv_driver_efficiency:     ___ms  [Target: < 50ms]
 * - mv_vehicle_utilization:   ___ms  [Target: < 50ms]
 * - mv_cost_analysis:         ___ms  [Target: < 50ms]
 *
 * SECTION 2: KPI FUNCTIONS
 * - get_delivery_kpis():      ___ms  [Target: < 100ms]
 * - get_driver_kpis():        ___ms  [Target: < 100ms]
 * - get_vehicle_kpis():       ___ms  [Target: < 100ms]
 * - get_cost_kpis():          ___ms  [Target: < 100ms]
 * - get_dashboard_summary():  ___ms  [Target: < 100ms] ⭐ CRITICAL
 *
 * SECTION 3: VIEW REFRESH
 * - Full refresh (all 4 views): ___s  [Target: < 5 seconds]
 *
 * SECTION 4: DATABASE SIZE
 * - mv_delivery_performance:  ___KB
 * - mv_driver_efficiency:     ___KB
 * - mv_vehicle_utilization:   ___KB
 * - mv_cost_analysis:         ___KB
 * - Total materialized views: ___KB
 *
 * PERFORMANCE STATUS: PASS / FAIL
 * Notes:
 * - [Add any performance observations]
 * - [Document any queries exceeding targets]
 * - [Note any optimization opportunities]
 */

-- ============================================================================
-- OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

/**
 * IF PERFORMANCE IS SLOW (> 100ms):
 *
 * 1. Check Materialized View Freshness
 *    - Run: SELECT * FROM pg_matviews WHERE schemaname = 'public';
 *    - Refresh if last_refresh is NULL or very old
 *
 * 2. Add Indexes to Source Tables (if missing)
 *    - delivery_batches: status, scheduled_date, created_at
 *    - drivers: status, id
 *    - vehicles: status, id
 *    - vehicle_tracking: vehicle_id, timestamp
 *
 * 3. Vacuum and Analyze
 *    - VACUUM ANALYZE public.delivery_batches;
 *    - VACUUM ANALYZE public.drivers;
 *    - VACUUM ANALYZE public.vehicles;
 *
 * 4. Check for Table Bloat
 *    - SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
 *      FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
 *
 * 5. Monitor Long-Running Queries
 *    - SELECT pid, now() - pg_stat_activity.query_start AS duration, query
 *      FROM pg_stat_activity
 *      WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '1 second';
 *
 * 6. Increase React Query Cache Time
 *    - If queries are fast but frontend feels slow, increase staleTime in hooks
 *    - Current: 5 minutes - Consider: 10 minutes for less-critical dashboards
 */

-- ============================================================================
-- END OF PERFORMANCE TESTS
-- ============================================================================

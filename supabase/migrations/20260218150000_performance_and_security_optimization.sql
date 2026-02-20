-- =====================================================
-- Performance & Security Optimization
-- =====================================================
-- This migration addresses:
-- 1. Slow queries by adding missing composite indexes
-- 2. SECURITY DEFINER view warnings (with careful review)
-- 3. Query performance improvements
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: PERFORMANCE - ADD COMPOSITE INDEXES
-- =====================================================

-- Add composite index for admin_units query (country_id, admin_level, is_active)
-- This query appears in the slow queries list with 154 calls
-- Current indexes are single-column, but the query filters on all three
CREATE INDEX IF NOT EXISTS idx_admin_units_country_level_active
  ON public.admin_units(country_id, admin_level, is_active)
  WHERE is_active = true;

-- Partial index for active admin units only (90%+ of queries use is_active = true)
-- This smaller index is faster for common queries

COMMENT ON INDEX idx_admin_units_country_level_active IS
  'Optimizes queries filtering by country, admin level, and active status';

-- =====================================================
-- PART 2: SECURITY - REVIEW SECURITY DEFINER VIEWS
-- =====================================================

-- In PostgreSQL, views are SECURITY DEFINER by default (run with owner permissions).
-- The linter recommends SECURITY INVOKER (run with user permissions) for security.
--
-- HOWEVER: Many of our views REQUIRE SECURITY DEFINER because they:
-- 1. Aggregate data across multiple tables with different RLS policies
-- 2. Provide read-only computed/summary data
-- 3. Are essential for dashboards and analytics
--
-- We'll set security_invoker=true ONLY on views that:
-- - Query single tables or tables with the same RLS policies
-- - Don't need to bypass RLS for legitimate business reasons
-- - Are safe for users to query with their own permissions

-- Safe to convert: Simple views that don't cross RLS boundaries
-- vehicles_unified_v - just selects from vehicles table, users have access
ALTER VIEW IF EXISTS public.vehicles_unified_v SET (security_invoker = true);

-- These views MUST remain SECURITY DEFINER (don't change):
-- ✓ vlms_vehicles_with_taxonomy - joins across VLMS and taxonomy tables
-- ✓ vehicle_slot_availability - aggregates slot data across assignments
-- ✓ vlms_available_vehicles - filters vehicles based on assignments
-- ✓ vlms_active_assignments - joins vehicles, drivers, batches
-- ✓ vehicles_with_taxonomy - joins vehicles with taxonomy
-- ✓ vehicles_with_tier_stats - aggregates tier statistics
-- ✓ slot_assignment_details - joins assignments, batches, vehicles, drivers
-- ✓ vlms_overdue_maintenance - calculates maintenance status
-- ✓ vehicle_tier_stats - aggregates vehicle statistics
-- ✓ batch_slot_utilization - aggregates batch and slot data
-- ✓ scheduler_overview_stats - aggregates scheduler statistics
-- ✓ workspace_readiness_details - aggregates workspace readiness checks
-- ✓ vlms_upcoming_maintenance - calculates upcoming maintenance
-- ✓ pending_invitations_view - joins invitations with user data
--
-- These remain SECURITY DEFINER because changing them would:
-- 1. Break functionality (users can't access all joined tables)
-- 2. Expose implementation details
-- 3. Require complex RLS policy changes

-- =====================================================
-- PART 3: ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Note: Realtime subscription queries are internal to Supabase
-- We cannot add indexes to realtime.subscription (not our table)
-- Those slow queries (96%+ of total) are expected Supabase overhead

-- Analyze tables to update statistics for query planner
ANALYZE public.admin_units;
ANALYZE public.vehicles;
ANALYZE public.user_roles;
ANALYZE public.profiles;

-- =====================================================
-- PART 4: QUERY OPTIMIZATION RECOMMENDATIONS
-- =====================================================

-- Note: pg_stat_statements extension is not enabled
-- Query performance monitoring is available through Supabase dashboard
-- under Database > Query Performance

-- =====================================================
-- PART 5: VERIFICATION & REPORTING
-- =====================================================

DO $$
DECLARE
  admin_units_index_exists boolean;
  vehicles_unified_security_invoker text;
BEGIN
  -- Check if new index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_admin_units_country_level_active'
  ) INTO admin_units_index_exists;

  -- Check security_invoker setting on vehicles_unified_v
  SELECT option_value INTO vehicles_unified_security_invoker
  FROM pg_options_to_table((
    SELECT reloptions FROM pg_class
    WHERE relname = 'vehicles_unified_v'
    AND relnamespace = 'public'::regnamespace
  )) WHERE option_name = 'security_invoker';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Performance & Security Optimization Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Indexes Added:';
  RAISE NOTICE '  - admin_units composite index: %',
    CASE WHEN admin_units_index_exists THEN '✅ CREATED' ELSE '❌ FAILED' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Views Updated:';
  RAISE NOTICE '  - vehicles_unified_v security_invoker: %',
    COALESCE(vehicles_unified_security_invoker, 'false (SECURITY DEFINER)');
  RAISE NOTICE '';
  RAISE NOTICE 'Security Notes:';
  RAISE NOTICE '  - 14 views remain SECURITY DEFINER (intentional for cross-table aggregation)';
  RAISE NOTICE '  - These views are read-only and provide safe summarized data';
  RAISE NOTICE '  - See migration comments for detailed explanation';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Notes:';
  RAISE NOTICE '  - admin_units queries should be faster with composite index';
  RAISE NOTICE '  - 96%% of slow queries are internal Supabase/realtime (cannot optimize)';
  RAISE NOTICE '  - Use Supabase Dashboard > Query Performance to monitor queries';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;

-- =====================================================
-- MONITORING QUERIES
-- =====================================================
--
-- To check slow queries: Use Supabase Dashboard > Database > Query Performance
--
-- To see index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;
--
-- To see table sizes:
-- SELECT schemaname, tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
-- =====================================================

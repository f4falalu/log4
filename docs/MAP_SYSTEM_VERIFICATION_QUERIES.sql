-- ============================================================================
-- Map System Phase 1 - Database Verification Queries
-- Run these in Supabase SQL Editor to verify successful migration
-- ============================================================================

-- ============================================================================
-- 1. VERIFY TABLES CREATED (Expected: 9 tables)
-- ============================================================================
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

-- Expected Output:
-- facility_assignments (12 columns)
-- forensics_query_log (10 columns)
-- map_action_audit (15 columns)
-- route_sketches (20 columns)
-- tradeoff_confirmations (12 columns)
-- tradeoff_items (16 columns)
-- tradeoff_routes (9 columns)
-- tradeoffs (26 columns)
-- zone_configurations (25 columns)
-- Total: 9 tables ✓


-- ============================================================================
-- 2. VERIFY INDEXES CREATED (Expected: 28+ indexes)
-- ============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY tablename, indexname;

-- Expected: 28+ indexes across all tables


-- ============================================================================
-- 3. VERIFY RLS POLICIES (Expected: 11+ policies)
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY tablename, policyname;

-- Expected Policies:
-- tradeoffs: 3 policies (view, create, update)
-- tradeoff_items: 2 policies (view, manage)
-- tradeoff_confirmations: 2 policies (view, update)
-- tradeoff_routes: 1 policy (view)
-- zone_configurations: 3 policies (view, create, update)
-- route_sketches: 2 policies (view, manage)
-- facility_assignments: 2 policies (view, manage)
-- map_action_audit: 2 policies (view, insert)
-- forensics_query_log: 2 policies (view, insert)
-- Total: 19 policies ✓


-- ============================================================================
-- 4. VERIFY RLS ENABLED (Expected: All tables enabled)
-- ============================================================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND (
  tablename LIKE 'tradeoff%'
  OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
)
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true


-- ============================================================================
-- 5. VERIFY DATABASE FUNCTIONS (Expected: 3 functions)
-- ============================================================================
SELECT
  routine_schema,
  routine_name,
  routine_type,
  data_type as return_type
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

-- Expected Functions:
-- activate_zone_configuration (returns boolean)
-- calculate_zone_centroid (returns trigger)
-- get_active_zones (returns TABLE)
-- get_workspace_tradeoffs (returns TABLE)
-- update_updated_at_column (returns trigger)
-- Total: 5 functions ✓


-- ============================================================================
-- 6. VERIFY TRIGGERS (Expected: 6 triggers)
-- ============================================================================
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN (
  'tradeoffs', 'tradeoff_items', 'tradeoff_confirmations',
  'zone_configurations', 'route_sketches', 'facility_assignments'
)
ORDER BY event_object_table, trigger_name;

-- Expected Triggers:
-- tradeoffs: update_tradeoffs_updated_at
-- tradeoff_items: update_tradeoff_items_updated_at
-- tradeoff_confirmations: update_tradeoff_confirmations_updated_at
-- zone_configurations: calculate_zone_centroid_trigger, update_zone_configurations_updated_at
-- route_sketches: update_route_sketches_updated_at
-- facility_assignments: update_facility_assignments_updated_at
-- Total: 7 triggers ✓


-- ============================================================================
-- 7. VERIFY POSTGIS GEOMETRY COLUMNS (Expected: 7 geometry columns)
-- ============================================================================
SELECT
  f_table_schema as schema,
  f_table_name as table_name,
  f_geometry_column as column_name,
  type as geometry_type,
  srid
FROM geometry_columns
WHERE f_table_schema = 'public'
AND (
  f_table_name LIKE 'tradeoff%'
  OR f_table_name IN ('zone_configurations', 'route_sketches', 'map_action_audit')
)
ORDER BY f_table_name, f_geometry_column;

-- Expected Geometry Columns:
-- map_action_audit: action_location (Point, SRID 4326)
-- route_sketches: route_geometry (LineString, SRID 4326)
-- tradeoff_confirmations: confirmation_location (Point, SRID 4326)
-- tradeoff_routes: route_geometry (LineString, SRID 4326)
-- tradeoffs: handover_point (Point, SRID 4326)
-- zone_configurations: boundary (Polygon, SRID 4326)
-- zone_configurations: centroid (Point, SRID 4326)
-- Total: 7 geometry columns ✓


-- ============================================================================
-- 8. TEST BASIC QUERIES (Should return 0 rows initially)
-- ============================================================================

-- Test Trade-Offs query
SELECT COUNT(*) as total_tradeoffs FROM public.tradeoffs;
-- Expected: 0 (no data yet)

-- Test Zone Configurations query
SELECT
  COUNT(*) as total_zones,
  COUNT(*) FILTER (WHERE active = true) as active_zones,
  COUNT(*) FILTER (WHERE active = false) as draft_zones
FROM public.zone_configurations;
-- Expected: 0, 0, 0 (no data yet)

-- Test Route Sketches query
SELECT COUNT(*) as total_routes FROM public.route_sketches;
-- Expected: 0 (no data yet)

-- Test Facility Assignments query
SELECT COUNT(*) as total_assignments FROM public.facility_assignments;
-- Expected: 0 (no data yet)


-- ============================================================================
-- 9. TEST DATABASE FUNCTION: get_workspace_tradeoffs
-- ============================================================================
SELECT * FROM get_workspace_tradeoffs('00000000-0000-0000-0000-000000000000');
-- Expected: 0 rows (no data yet, but function should execute without error)


-- ============================================================================
-- 10. TEST DATABASE FUNCTION: get_active_zones
-- ============================================================================
SELECT * FROM get_active_zones('00000000-0000-0000-0000-000000000000');
-- Expected: 0 rows (no data yet, but function should execute without error)


-- ============================================================================
-- 11. COMPREHENSIVE SUMMARY
-- ============================================================================
SELECT
  'Tables Created' as verification_item,
  (
    SELECT COUNT(*)::text
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (
      table_name LIKE 'tradeoff%'
      OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
    )
  ) as count,
  '9' as expected,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE 'tradeoff%'
        OR table_name IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
      )
    ) = 9 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status

UNION ALL

SELECT
  'Indexes Created',
  (
    SELECT COUNT(*)::text
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (
      tablename LIKE 'tradeoff%'
      OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
    )
  ),
  '28+',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (
        tablename LIKE 'tradeoff%'
        OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
      )
    ) >= 28 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END

UNION ALL

SELECT
  'RLS Policies',
  (
    SELECT COUNT(*)::text
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
      tablename LIKE 'tradeoff%'
      OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
    )
  ),
  '11+',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (
        tablename LIKE 'tradeoff%'
        OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
      )
    ) >= 11 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END

UNION ALL

SELECT
  'Database Functions',
  (
    SELECT COUNT(*)::text
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
      'get_workspace_tradeoffs',
      'activate_zone_configuration',
      'get_active_zones'
    )
  ),
  '3',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN (
        'get_workspace_tradeoffs',
        'activate_zone_configuration',
        'get_active_zones'
      )
    ) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END

UNION ALL

SELECT
  'PostGIS Geometry Columns',
  (
    SELECT COUNT(*)::text
    FROM geometry_columns
    WHERE f_table_schema = 'public'
    AND (
      f_table_name LIKE 'tradeoff%'
      OR f_table_name IN ('zone_configurations', 'route_sketches', 'map_action_audit')
    )
  ),
  '7',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM geometry_columns
      WHERE f_table_schema = 'public'
      AND (
        f_table_name LIKE 'tradeoff%'
        OR f_table_name IN ('zone_configurations', 'route_sketches', 'map_action_audit')
      )
    ) = 7 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END

UNION ALL

SELECT
  'RLS Enabled on All Tables',
  (
    SELECT COUNT(*)::text
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
    AND (
      tablename LIKE 'tradeoff%'
      OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
    )
  ),
  '9',
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_tables
      WHERE schemaname = 'public'
      AND rowsecurity = true
      AND (
        tablename LIKE 'tradeoff%'
        OR tablename IN ('zone_configurations', 'route_sketches', 'facility_assignments', 'map_action_audit', 'forensics_query_log')
      )
    ) = 9 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END;

-- ============================================================================
-- EXPECTED FINAL OUTPUT:
-- ============================================================================
-- verification_item                | count | expected | status
-- ---------------------------------+-------+----------+----------
-- Tables Created                   | 9     | 9        | ✅ PASS
-- Indexes Created                  | 28+   | 28+      | ✅ PASS
-- RLS Policies                     | 11+   | 11+      | ✅ PASS
-- Database Functions               | 3     | 3        | ✅ PASS
-- PostGIS Geometry Columns         | 7     | 7        | ✅ PASS
-- RLS Enabled on All Tables        | 9     | 9        | ✅ PASS
-- ============================================================================

-- If all show ✅ PASS, the migration was 100% successful!

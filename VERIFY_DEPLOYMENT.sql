-- ============================================================================
-- DEPLOYMENT VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful
-- ============================================================================

-- Step 1: Check Trade-off tables exist and are empty
SELECT COUNT(*) as tradeoffs_count FROM public.tradeoffs;
SELECT COUNT(*) as tradeoff_items_count FROM public.tradeoff_items;
SELECT COUNT(*) as tradeoff_confirmations_count FROM public.tradeoff_confirmations;
SELECT COUNT(*) as tradeoff_routes_count FROM public.tradeoff_routes;

-- Step 2: Check Planning tables exist and are empty
SELECT COUNT(*) as zone_configurations_count FROM public.zone_configurations;
SELECT COUNT(*) as route_sketches_count FROM public.route_sketches;
SELECT COUNT(*) as facility_assignments_count FROM public.facility_assignments;
SELECT COUNT(*) as map_action_audit_count FROM public.map_action_audit;
SELECT COUNT(*) as forensics_query_log_count FROM public.forensics_query_log;

-- Step 3: Check Payloads table exists and is empty
SELECT COUNT(*) as payloads_count FROM payloads;

-- Step 4: Verify payload_id column was added to payload_items
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payload_items'
AND column_name IN ('payload_id', 'batch_id')
ORDER BY column_name;

-- Step 5: Check that batch_id is now nullable
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payload_items'
AND column_name = 'batch_id';

-- Expected Results:
-- - All COUNT queries should return 0 (tables exist but are empty)
-- - payload_id column should exist with type 'uuid' and is_nullable = 'YES'
-- - batch_id should now be is_nullable = 'YES' (was 'NO' before)

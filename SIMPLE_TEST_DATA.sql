-- ============================================================================
-- Simple Test Data for Analytics System
-- Creates ONE test batch to verify enum values work
-- ============================================================================

-- First, verify what enum values exist
SELECT 'Current batch_status enum values:' as info;
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'batch_status')
ORDER BY enumsortorder;

-- Check if we have required base data
SELECT
  (SELECT COUNT(*) FROM vehicles) as vehicle_count,
  (SELECT COUNT(*) FROM drivers) as driver_count,
  (SELECT COUNT(*) FROM facilities) as facility_count;

-- Insert ONE test batch with 'completed' status (safest option)
INSERT INTO delivery_batches (
  name,
  status,
  priority,
  scheduled_date,
  scheduled_time,
  actual_start_time,
  actual_end_time,
  vehicle_id,
  driver_id,
  total_quantity,
  total_distance,
  estimated_duration,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test Batch - Completed',
  'completed'::batch_status,
  'high'::batch_priority,
  CURRENT_DATE - INTERVAL '5 days',
  '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '10:30:00'::time,
  (SELECT id FROM vehicles LIMIT 1),
  (SELECT id FROM drivers LIMIT 1),
  50,
  45.5,
  150,
  ARRAY(SELECT id FROM facilities LIMIT 3),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM vehicles LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.cost_analysis;

-- Show results
SELECT 'Analytics view record counts after insert:' as info;
SELECT 'delivery_performance' as view_name, COUNT(*) as record_count
FROM analytics.delivery_performance
UNION ALL
SELECT 'driver_efficiency', COUNT(*) FROM analytics.driver_efficiency
UNION ALL
SELECT 'vehicle_utilization', COUNT(*) FROM analytics.vehicle_utilization
UNION ALL
SELECT 'cost_analysis', COUNT(*) FROM analytics.cost_analysis;

-- Show the delivery data
SELECT
  batch_id,
  scheduled_date,
  status,
  vehicle_number,
  driver_name,
  facilities_count,
  completion_time_hours,
  on_time
FROM analytics.delivery_performance
ORDER BY scheduled_date DESC
LIMIT 5;

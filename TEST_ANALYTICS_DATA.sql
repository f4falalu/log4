-- ============================================================================
-- Create Test Data for Analytics System
-- Run this to populate materialized views with sample deliveries
-- ============================================================================

-- First, check if we have the required base data
SELECT
  (SELECT COUNT(*) FROM vehicles) as vehicle_count,
  (SELECT COUNT(*) FROM drivers) as driver_count,
  (SELECT COUNT(*) FROM facilities) as facility_count;

-- Insert test delivery batches (adjust based on your schema)
-- NOTE: This assumes you have at least 1 vehicle, 1 driver, and some facilities

-- Example test batch 1 (Completed on-time)
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
  'Test Delivery Batch 1',
  'completed',
  'high',
  CURRENT_DATE - INTERVAL '5 days',
  '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '10:30:00'::time, -- Completed in 2.5 hours
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

-- Example test batch 2 (Completed late)
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
  'Test Delivery Batch 2',
  'completed',
  'medium',
  CURRENT_DATE - INTERVAL '3 days',
  '09:00:00'::time,
  (CURRENT_DATE - INTERVAL '3 days')::timestamp + '09:30:00'::time, -- Started 30min late
  (CURRENT_DATE - INTERVAL '3 days')::timestamp + '14:00:00'::time, -- Took 4.5 hours
  (SELECT id FROM vehicles LIMIT 1 OFFSET 1),
  (SELECT id FROM drivers LIMIT 1 OFFSET 1),
  75,
  62.3,
  180,
  ARRAY(SELECT id FROM facilities LIMIT 5),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM vehicles LIMIT 1 OFFSET 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1 OFFSET 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- Example test batch 3 (In progress)
INSERT INTO delivery_batches (
  name,
  status,
  priority,
  scheduled_date,
  scheduled_time,
  actual_start_time,
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
  'Test Delivery Batch 3',
  'in_progress',
  'urgent',
  CURRENT_DATE,
  '10:00:00'::time,
  CURRENT_TIMESTAMP,
  (SELECT id FROM vehicles LIMIT 1),
  (SELECT id FROM drivers LIMIT 1),
  30,
  25.0,
  90,
  ARRAY(SELECT id FROM facilities LIMIT 2),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM vehicles LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- Refresh materialized views to include new data
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.cost_analysis;

-- Verify data was added
SELECT 'delivery_performance' as view_name, COUNT(*) as record_count
FROM analytics.delivery_performance
UNION ALL
SELECT 'driver_efficiency', COUNT(*) FROM analytics.driver_efficiency
UNION ALL
SELECT 'vehicle_utilization', COUNT(*) FROM analytics.vehicle_utilization
UNION ALL
SELECT 'cost_analysis', COUNT(*) FROM analytics.cost_analysis;

-- Show sample delivery data
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
ORDER BY scheduled_date DESC;

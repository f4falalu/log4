-- ============================================================================
-- Create Test Data for Analytics System (FIXED)
-- Run this to populate materialized views with sample deliveries
-- ============================================================================

-- First, check if we have the required base data
SELECT
  (SELECT COUNT(*) FROM vehicles) as vehicle_count,
  (SELECT COUNT(*) FROM drivers) as driver_count,
  (SELECT COUNT(*) FROM facilities) as facility_count;

-- Insert test delivery batches
-- Valid batch_status values: 'planned', 'assigned', 'in-progress', 'completed', 'cancelled'

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
  'completed'::batch_status,
  'high'::batch_priority,
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
  'completed'::batch_status,
  'medium'::batch_priority,
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

-- Example test batch 3 (In progress) - FIXED: 'in-progress' with hyphen
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
  'in-progress'::batch_status,  -- FIXED: hyphen instead of underscore
  'urgent'::batch_priority,
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

-- Example test batch 4 (Assigned but not started)
INSERT INTO delivery_batches (
  name,
  status,
  priority,
  scheduled_date,
  scheduled_time,
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
  'Test Delivery Batch 4',
  'assigned'::batch_status,
  'medium'::batch_priority,
  CURRENT_DATE + INTERVAL '1 day',
  '07:00:00'::time,
  (SELECT id FROM vehicles LIMIT 1 OFFSET 2),
  (SELECT id FROM drivers LIMIT 1 OFFSET 2),
  40,
  35.0,
  120,
  ARRAY(SELECT id FROM facilities LIMIT 4),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM vehicles LIMIT 1 OFFSET 2)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1 OFFSET 2)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- Example test batch 5 (Planned)
INSERT INTO delivery_batches (
  name,
  status,
  priority,
  scheduled_date,
  scheduled_time,
  total_quantity,
  total_distance,
  estimated_duration,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Test Delivery Batch 5',
  'planned'::batch_status,
  'low'::batch_priority,
  CURRENT_DATE + INTERVAL '2 days',
  '08:00:00'::time,
  25,
  20.0,
  60,
  ARRAY(SELECT id FROM facilities LIMIT 2),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM facilities LIMIT 1);

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

-- Show driver efficiency
SELECT
  driver_id,
  driver_name,
  total_deliveries,
  completed_deliveries,
  on_time_rate,
  avg_completion_time_hours
FROM analytics.driver_efficiency
WHERE total_deliveries > 0
ORDER BY on_time_rate DESC;

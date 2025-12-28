-- ============================================================================
-- Analytics Test Data - FINAL CORRECTED VERSION
-- Creates sample delivery batches matching actual schema
-- ============================================================================

-- Show current enum values
SELECT 'batch_status enum values:' as info;
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'batch_status')
ORDER BY enumsortorder;

SELECT 'delivery_priority enum values:' as info;
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'delivery_priority')
ORDER BY enumsortorder;

-- Check required base data
SELECT
  (SELECT COUNT(*) FROM warehouses) as warehouse_count,
  (SELECT COUNT(*) FROM vehicles) as vehicle_count,
  (SELECT COUNT(*) FROM drivers) as driver_count,
  (SELECT COUNT(*) FROM facilities) as facility_count;

-- ============================================================================
-- Test Batch 1: Completed On-Time
-- ============================================================================
INSERT INTO delivery_batches (
  name,
  warehouse_id,
  driver_id,
  vehicle_id,
  scheduled_date,
  scheduled_time,
  status,
  priority,
  total_distance,
  estimated_duration,
  actual_start_time,
  actual_end_time,
  medication_type,
  total_quantity,
  optimized_route,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test - Completed On-Time',
  (SELECT id FROM warehouses LIMIT 1),
  (SELECT id FROM drivers LIMIT 1),
  (SELECT id FROM vehicles LIMIT 1),
  CURRENT_DATE - INTERVAL '5 days',
  '08:00:00'::time,
  'completed'::batch_status,
  'high'::delivery_priority,
  45.5,
  150,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '5 days')::timestamp + '10:30:00'::time,
  'General Medicines',
  50,
  '{"type":"FeatureCollection","features":[]}'::jsonb,
  ARRAY(SELECT id FROM facilities LIMIT 3),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM warehouses LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1)
  AND EXISTS (SELECT 1 FROM vehicles LIMIT 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- ============================================================================
-- Test Batch 2: Completed Late
-- ============================================================================
INSERT INTO delivery_batches (
  name,
  warehouse_id,
  driver_id,
  vehicle_id,
  scheduled_date,
  scheduled_time,
  status,
  priority,
  total_distance,
  estimated_duration,
  actual_start_time,
  actual_end_time,
  medication_type,
  total_quantity,
  optimized_route,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test - Completed Late',
  (SELECT id FROM warehouses LIMIT 1),
  (SELECT id FROM drivers LIMIT 1 OFFSET 1),
  (SELECT id FROM vehicles LIMIT 1 OFFSET 1),
  CURRENT_DATE - INTERVAL '3 days',
  '09:00:00'::time,
  'completed'::batch_status,
  'medium'::delivery_priority,
  62.3,
  180,
  (CURRENT_DATE - INTERVAL '3 days')::timestamp + '09:30:00'::time,
  (CURRENT_DATE - INTERVAL '3 days')::timestamp + '14:00:00'::time,
  'Antibiotics',
  75,
  '{"type":"FeatureCollection","features":[]}'::jsonb,
  ARRAY(SELECT id FROM facilities LIMIT 5),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM warehouses LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1 OFFSET 1)
  AND EXISTS (SELECT 1 FROM vehicles LIMIT 1 OFFSET 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- ============================================================================
-- Test Batch 3: In Progress
-- ============================================================================
INSERT INTO delivery_batches (
  name,
  warehouse_id,
  driver_id,
  vehicle_id,
  scheduled_date,
  scheduled_time,
  status,
  priority,
  total_distance,
  estimated_duration,
  actual_start_time,
  medication_type,
  total_quantity,
  optimized_route,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test - In Progress',
  (SELECT id FROM warehouses LIMIT 1),
  (SELECT id FROM drivers LIMIT 1),
  (SELECT id FROM vehicles LIMIT 1),
  CURRENT_DATE,
  '10:00:00'::time,
  'in-progress'::batch_status,
  'urgent'::delivery_priority,
  25.0,
  90,
  CURRENT_TIMESTAMP,
  'Vaccines',
  30,
  '{"type":"FeatureCollection","features":[]}'::jsonb,
  ARRAY(SELECT id FROM facilities LIMIT 2),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM warehouses LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1)
  AND EXISTS (SELECT 1 FROM vehicles LIMIT 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- ============================================================================
-- Test Batch 4: Assigned (Not Started)
-- ============================================================================
INSERT INTO delivery_batches (
  name,
  warehouse_id,
  driver_id,
  vehicle_id,
  scheduled_date,
  scheduled_time,
  status,
  priority,
  total_distance,
  estimated_duration,
  medication_type,
  total_quantity,
  optimized_route,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test - Assigned',
  (SELECT id FROM warehouses LIMIT 1),
  (SELECT id FROM drivers LIMIT 1 OFFSET 2),
  (SELECT id FROM vehicles LIMIT 1 OFFSET 2),
  CURRENT_DATE + INTERVAL '1 day',
  '07:00:00'::time,
  'assigned'::batch_status,
  'medium'::delivery_priority,
  35.0,
  120,
  'Pain Relievers',
  40,
  '{"type":"FeatureCollection","features":[]}'::jsonb,
  ARRAY(SELECT id FROM facilities LIMIT 4),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM warehouses LIMIT 1)
  AND EXISTS (SELECT 1 FROM drivers LIMIT 1 OFFSET 2)
  AND EXISTS (SELECT 1 FROM vehicles LIMIT 1 OFFSET 2)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- ============================================================================
-- Test Batch 5: Planned
-- ============================================================================
INSERT INTO delivery_batches (
  name,
  warehouse_id,
  scheduled_date,
  scheduled_time,
  status,
  priority,
  total_distance,
  estimated_duration,
  medication_type,
  total_quantity,
  optimized_route,
  facility_ids,
  created_at,
  updated_at
)
SELECT
  'Analytics Test - Planned',
  (SELECT id FROM warehouses LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '08:00:00'::time,
  'planned'::batch_status,
  'low'::delivery_priority,
  20.0,
  60,
  'Vitamins',
  25,
  '{"type":"FeatureCollection","features":[]}'::jsonb,
  ARRAY(SELECT id FROM facilities LIMIT 2),
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM warehouses LIMIT 1)
  AND EXISTS (SELECT 1 FROM facilities LIMIT 1);

-- ============================================================================
-- Refresh Materialized Views
-- ============================================================================
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.cost_analysis;

-- ============================================================================
-- Show Results
-- ============================================================================

-- View record counts
SELECT 'Analytics view record counts:' as info;
SELECT 'delivery_performance' as view_name, COUNT(*) as record_count
FROM analytics.delivery_performance
UNION ALL
SELECT 'driver_efficiency', COUNT(*) FROM analytics.driver_efficiency
UNION ALL
SELECT 'vehicle_utilization', COUNT(*) FROM analytics.vehicle_utilization
UNION ALL
SELECT 'cost_analysis', COUNT(*) FROM analytics.cost_analysis
ORDER BY view_name;

-- Sample delivery performance data
SELECT 'Sample delivery performance data:' as info;
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
LIMIT 10;

-- Driver efficiency summary
SELECT 'Driver efficiency summary:' as info;
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

-- Show inserted batches
SELECT 'Inserted test batches:' as info;
SELECT
  name,
  status,
  priority,
  scheduled_date,
  total_distance,
  medication_type
FROM delivery_batches
WHERE name LIKE 'Analytics Test%'
ORDER BY scheduled_date;

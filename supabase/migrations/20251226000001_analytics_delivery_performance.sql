-- Phase 2: Analytics Backend - Ticket A1
-- Materialized View: Delivery Performance
--
-- Purpose: Pre-aggregates delivery performance metrics to eliminate real-time
--          client-side calculations. Provides on-time rate, completion time,
--          and item counts for delivery analytics.
--
-- Performance Target: < 100ms for queries
-- Refresh Target: < 5 seconds even with 100K+ records
--
-- NOTE: This version works with the current schema. Workspace isolation
--       will be added when workspaces table is implemented.

-- ============================================================================
-- 1. CREATE ANALYTICS SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;

COMMENT ON SCHEMA analytics IS 'Phase 2: Server-side analytics infrastructure for BIKO Platform';

-- ============================================================================
-- 2. CREATE MATERIALIZED VIEW: delivery_performance
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.delivery_performance AS
SELECT
  db.id as batch_id,
  db.scheduled_date,
  (db.scheduled_date::timestamp + db.scheduled_time) as scheduled_datetime,
  db.actual_end_time as completed_date,
  db.status::text,
  v.id as vehicle_id,
  v.plate_number as vehicle_number,
  v.type::text as vehicle_type,
  d.id as driver_id,
  d.name as driver_name,

  -- Aggregated counts (from facility_ids array and total_quantity field)
  COALESCE(array_length(db.facility_ids, 1), 0) as facilities_count,
  db.total_quantity as items_count,
  db.total_quantity as total_quantity,

  -- Performance metrics
  CASE
    WHEN db.actual_end_time IS NOT NULL AND db.actual_start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600
    ELSE NULL
  END as completion_time_hours,

  -- On-time calculation (comparing actual end time with scheduled datetime)
  CASE
    WHEN db.actual_end_time IS NOT NULL
    THEN db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
    ELSE NULL
  END as on_time,

  -- Status breakdown (derived from batch status since no items table exists)
  CASE WHEN db.status = 'completed' THEN db.total_quantity ELSE 0 END as completed_items,
  CASE WHEN db.status = 'cancelled' THEN db.total_quantity ELSE 0 END as failed_items,

  -- Additional metrics
  db.total_distance,
  db.estimated_duration,
  db.priority::text,

  -- Timestamps
  db.created_at,
  db.updated_at
FROM public.delivery_batches db
LEFT JOIN public.vehicles v ON db.vehicle_id = v.id
LEFT JOIN public.drivers d ON db.driver_id = d.id;

-- ============================================================================
-- 3. CREATE UNIQUE INDEX FOR CONCURRENT REFRESH
-- ============================================================================

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_delivery_perf_batch_id_unique
  ON analytics.delivery_performance(batch_id);

-- ============================================================================
-- 4. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_delivery_perf_scheduled
  ON analytics.delivery_performance(scheduled_date DESC);

CREATE INDEX idx_delivery_perf_status
  ON analytics.delivery_performance(status);

CREATE INDEX idx_delivery_perf_vehicle
  ON analytics.delivery_performance(vehicle_id)
  WHERE vehicle_id IS NOT NULL;

CREATE INDEX idx_delivery_perf_driver
  ON analytics.delivery_performance(driver_id)
  WHERE driver_id IS NOT NULL;

CREATE INDEX idx_delivery_perf_on_time
  ON analytics.delivery_performance(on_time)
  WHERE on_time IS NOT NULL;

-- Composite index for common date range queries
CREATE INDEX idx_delivery_perf_scheduled_status
  ON analytics.delivery_performance(scheduled_date DESC, status);

-- ============================================================================
-- 5. CREATE REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_delivery_performance()
RETURNS trigger AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_delivery_performance() IS
  'Refreshes delivery_performance materialized view when delivery_batches changes';

-- ============================================================================
-- 6. CREATE TRIGGERS
-- ============================================================================

-- Trigger on delivery_batches table
CREATE TRIGGER trg_refresh_delivery_perf
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_delivery_performance();

-- ============================================================================
-- 7. ENABLE RLS AND CREATE POLICIES
-- ============================================================================

ALTER MATERIALIZED VIEW analytics.delivery_performance OWNER TO postgres;

-- Note: RLS will be added when workspace support is implemented
-- For now, access is controlled via database roles

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;
GRANT SELECT ON analytics.delivery_performance TO authenticated, anon;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW analytics.delivery_performance IS
  'Phase 2 Analytics: Pre-aggregated delivery performance metrics.
   Eliminates client-side aggregation for delivery analytics dashboards.
   Target query performance: < 100ms for queries.
   Refresh time target: < 5 seconds.

   NOTE: Currently does not include workspace isolation. Will be added
   when workspaces table is implemented in the schema.';

COMMENT ON COLUMN analytics.delivery_performance.batch_id IS 'Delivery batch primary key (unique)';
COMMENT ON COLUMN analytics.delivery_performance.scheduled_date IS 'Scheduled delivery date';
COMMENT ON COLUMN analytics.delivery_performance.scheduled_datetime IS 'Combined scheduled date and time';
COMMENT ON COLUMN analytics.delivery_performance.completed_date IS 'Actual completion timestamp (actual_end_time)';
COMMENT ON COLUMN analytics.delivery_performance.facilities_count IS 'Number of facilities in this batch (from facility_ids array length)';
COMMENT ON COLUMN analytics.delivery_performance.items_count IS 'Total number of items in this batch';
COMMENT ON COLUMN analytics.delivery_performance.completion_time_hours IS 'Hours between actual_start_time and actual_end_time';
COMMENT ON COLUMN analytics.delivery_performance.on_time IS 'TRUE if completed on or before scheduled time, FALSE if late, NULL if not completed';
COMMENT ON COLUMN analytics.delivery_performance.completed_items IS 'Items completed (estimated from batch status)';
COMMENT ON COLUMN analytics.delivery_performance.failed_items IS 'Items failed (estimated from batch status)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

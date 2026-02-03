-- Phase 2: Analytics Backend - Ticket A2
-- Materialized View: Driver Efficiency
--
-- Purpose: Pre-aggregates driver performance metrics to eliminate real-time
--          client-side calculations. Provides on-time rate, completion time,
--          fuel efficiency, and incident tracking for driver analytics.
--
-- Performance Target: < 100ms for queries
-- Refresh Target: < 5 seconds even with 100K+ records
--
-- NOTE: This version works with the current schema. Workspace isolation
--       will be added when workspaces table is implemented.

-- ============================================================================
-- 1. CREATE MATERIALIZED VIEW: driver_efficiency
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.driver_efficiency AS
SELECT
  d.id as driver_id,
  d.name as driver_name,
  d.phone,
  d.license_type::text,
  'available'::text as driver_status,  -- Note: drivers.status column may not exist in all deployments

  -- Pre-calculated metrics from drivers table
  d.performance_score,
  d.total_deliveries,
  d.on_time_percentage,

  -- Shift information
  d.shift_start,
  d.shift_end,
  d.max_hours,

  -- Delivery performance aggregates (from delivery_batches)
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed') as completed_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'cancelled') as cancelled_batches,
  COUNT(DISTINCT db.id) as total_batches,

  -- On-time performance (detailed calculation)
  COUNT(DISTINCT db.id) FILTER (
    WHERE db.status = 'completed'
    AND db.actual_end_time IS NOT NULL
    AND db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
  ) as on_time_batches,

  COUNT(DISTINCT db.id) FILTER (
    WHERE db.status = 'completed'
    AND db.actual_end_time IS NOT NULL
    AND db.actual_end_time > (db.scheduled_date::timestamp + db.scheduled_time)
  ) as late_batches,

  -- On-time rate calculation (rounded to 2 decimals)
  ROUND(
    CASE
      WHEN COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed' AND db.actual_end_time IS NOT NULL) > 0
      THEN (
        COUNT(DISTINCT db.id) FILTER (
          WHERE db.status = 'completed'
          AND db.actual_end_time IS NOT NULL
          AND db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
        )::NUMERIC /
        COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed' AND db.actual_end_time IS NOT NULL)::NUMERIC
      ) * 100
      ELSE d.on_time_percentage  -- Fallback to pre-calculated value
    END,
    2
  ) as on_time_rate,

  -- Average completion time (in hours)
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600
    ) FILTER (
      WHERE db.actual_end_time IS NOT NULL
      AND db.actual_start_time IS NOT NULL
    ),
    2
  ) as avg_completion_time_hours,

  -- Total items delivered
  SUM(db.total_quantity) FILTER (WHERE db.status = 'completed') as total_items_delivered,

  -- Total distance covered
  SUM(db.total_distance) FILTER (WHERE db.status = 'completed') as total_distance_km,

  -- Fuel efficiency metrics (from vehicle_trips)
  COUNT(DISTINCT vt.id) as total_trips,
  ROUND(SUM(vt.fuel_consumed), 2) as total_fuel_consumed_liters,

  -- Fuel efficiency calculation (km per liter)
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0
      THEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)
      ELSE NULL
    END,
    2
  ) as fuel_efficiency_km_per_liter,

  -- Average fuel per trip
  ROUND(
    AVG(vt.fuel_consumed) FILTER (WHERE vt.fuel_consumed IS NOT NULL),
    2
  ) as avg_fuel_per_trip_liters,

  -- Incident tracking (from notifications table - urgent notifications related to driver)
  COUNT(DISTINCT n.id) FILTER (
    WHERE n.type = 'urgent'
    AND n.related_entity_type = 'driver'
  ) as total_incidents,

  -- Most recent activity
  MAX(db.actual_end_time) as last_delivery_date,
  MAX(vt.end_time) as last_trip_date,

  -- Timestamps
  d.created_at as driver_created_at,
  d.updated_at as driver_updated_at,
  NOW() as metrics_calculated_at

FROM public.drivers d
LEFT JOIN public.delivery_batches db ON db.driver_id = d.id
LEFT JOIN public.vehicle_trips vt ON vt.driver_id = d.id
LEFT JOIN public.notifications n ON n.related_entity_id = d.id AND n.related_entity_type = 'driver'
GROUP BY
  d.id,
  d.name,
  d.phone,
  d.license_type,
  d.performance_score,
  d.total_deliveries,
  d.on_time_percentage,
  d.shift_start,
  d.shift_end,
  d.max_hours,
  d.created_at,
  d.updated_at;

-- ============================================================================
-- 2. CREATE UNIQUE INDEX FOR CONCURRENT REFRESH
-- ============================================================================

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_driver_efficiency_driver_id_unique
  ON analytics.driver_efficiency(driver_id);

-- ============================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_driver_efficiency_status
  ON analytics.driver_efficiency(driver_status);

CREATE INDEX idx_driver_efficiency_on_time_rate
  ON analytics.driver_efficiency(on_time_rate DESC)
  WHERE on_time_rate IS NOT NULL;

CREATE INDEX idx_driver_efficiency_performance
  ON analytics.driver_efficiency(performance_score DESC)
  WHERE performance_score IS NOT NULL;

CREATE INDEX idx_driver_efficiency_total_batches
  ON analytics.driver_efficiency(total_batches DESC);

CREATE INDEX idx_driver_efficiency_fuel_efficiency
  ON analytics.driver_efficiency(fuel_efficiency_km_per_liter DESC)
  WHERE fuel_efficiency_km_per_liter IS NOT NULL;

CREATE INDEX idx_driver_efficiency_incidents
  ON analytics.driver_efficiency(total_incidents DESC)
  WHERE total_incidents > 0;

-- Composite index for common queries (status + on-time rate)
CREATE INDEX idx_driver_efficiency_status_ontime
  ON analytics.driver_efficiency(driver_status, on_time_rate DESC)
  WHERE on_time_rate IS NOT NULL;

-- ============================================================================
-- 4. CREATE REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_driver_efficiency()
RETURNS trigger AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_driver_efficiency() IS
  'Refreshes driver_efficiency materialized view when related tables change';

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger on drivers table
CREATE TRIGGER trg_refresh_driver_efficiency_drivers
AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- Trigger on delivery_batches table (when driver assignments change)
CREATE TRIGGER trg_refresh_driver_efficiency_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- Trigger on vehicle_trips table (when fuel data changes)
CREATE TRIGGER trg_refresh_driver_efficiency_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- Trigger on notifications table (when incidents are recorded)
CREATE TRIGGER trg_refresh_driver_efficiency_notifications
AFTER INSERT OR UPDATE OR DELETE ON public.notifications
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON analytics.driver_efficiency TO authenticated, anon;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW analytics.driver_efficiency IS
  'Phase 2 Analytics: Pre-aggregated driver performance metrics.
   Eliminates client-side aggregation for driver analytics dashboards.
   Target query performance: < 100ms for queries.
   Refresh time target: < 5 seconds.

   NOTE: Currently does not include workspace isolation. Will be added
   when workspaces table is implemented in the schema.

   Includes:
   - On-time delivery rate (calculated from delivery_batches)
   - Average completion time per batch
   - Fuel efficiency metrics (from vehicle_trips)
   - Incident tracking (from notifications with type=urgent)
   - Total deliveries, distance, and items delivered';

COMMENT ON COLUMN analytics.driver_efficiency.driver_id IS 'Driver primary key (unique)';
COMMENT ON COLUMN analytics.driver_efficiency.driver_name IS 'Driver full name';
COMMENT ON COLUMN analytics.driver_efficiency.performance_score IS 'Pre-calculated performance score from drivers table';
COMMENT ON COLUMN analytics.driver_efficiency.total_deliveries IS 'Pre-calculated total deliveries from drivers table';
COMMENT ON COLUMN analytics.driver_efficiency.on_time_percentage IS 'Pre-calculated on-time percentage from drivers table';
COMMENT ON COLUMN analytics.driver_efficiency.completed_batches IS 'Count of batches completed by this driver';
COMMENT ON COLUMN analytics.driver_efficiency.on_time_batches IS 'Count of batches completed on or before scheduled time';
COMMENT ON COLUMN analytics.driver_efficiency.late_batches IS 'Count of batches completed after scheduled time';
COMMENT ON COLUMN analytics.driver_efficiency.on_time_rate IS 'Percentage of completed batches that were on-time (0-100)';
COMMENT ON COLUMN analytics.driver_efficiency.avg_completion_time_hours IS 'Average hours taken to complete a batch';
COMMENT ON COLUMN analytics.driver_efficiency.total_items_delivered IS 'Sum of all items delivered across all completed batches';
COMMENT ON COLUMN analytics.driver_efficiency.total_distance_km IS 'Total distance covered across all completed batches';
COMMENT ON COLUMN analytics.driver_efficiency.total_fuel_consumed_liters IS 'Total fuel consumed across all trips';
COMMENT ON COLUMN analytics.driver_efficiency.fuel_efficiency_km_per_liter IS 'Kilometers per liter (total distance / total fuel)';
COMMENT ON COLUMN analytics.driver_efficiency.avg_fuel_per_trip_liters IS 'Average fuel consumption per trip';
COMMENT ON COLUMN analytics.driver_efficiency.total_incidents IS 'Count of urgent notifications related to this driver';
COMMENT ON COLUMN analytics.driver_efficiency.last_delivery_date IS 'Most recent delivery completion timestamp';
COMMENT ON COLUMN analytics.driver_efficiency.metrics_calculated_at IS 'Timestamp when metrics were last refreshed';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

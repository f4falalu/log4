-- Phase 2: Analytics Backend - Ticket A3
-- Materialized View: Vehicle Utilization
--
-- Purpose: Pre-aggregates vehicle utilization metrics to eliminate real-time
--          client-side calculations. Provides usage rate, maintenance costs,
--          fuel efficiency, and availability tracking for vehicle analytics.
--
-- Performance Target: < 100ms for queries
-- Refresh Target: < 5 seconds even with 100K+ records
--
-- NOTE: This version works with the current schema. Workspace isolation
--       will be added when workspaces table is implemented.

-- ============================================================================
-- 1. CREATE MATERIALIZED VIEW: vehicle_utilization
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.vehicle_utilization AS
SELECT
  v.id as vehicle_id,
  v.type::text as vehicle_type,
  v.model,
  v.plate_number,
  v.status::text as vehicle_status,
  v.fuel_type::text,

  -- Capacity and specs
  v.capacity,
  v.max_weight,
  v.avg_speed,
  v.fuel_efficiency as rated_fuel_efficiency,

  -- Current assignment
  v.current_driver_id,
  d.name as current_driver_name,

  -- Delivery batch utilization (from delivery_batches)
  COUNT(DISTINCT db.id) as total_batches_assigned,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed') as completed_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'in-progress') as active_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'cancelled') as cancelled_batches,

  -- Utilization rate calculation (completed batches as % of assigned)
  ROUND(
    CASE
      WHEN COUNT(DISTINCT db.id) > 0
      THEN (COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed')::NUMERIC / COUNT(DISTINCT db.id)::NUMERIC) * 100
      ELSE 0
    END,
    2
  ) as utilization_rate,

  -- Distance and delivery metrics
  SUM(db.total_distance) FILTER (WHERE db.status = 'completed') as total_distance_km,
  SUM(db.total_quantity) FILTER (WHERE db.status = 'completed') as total_items_delivered,

  -- Average metrics per batch
  ROUND(
    AVG(db.total_distance) FILTER (WHERE db.status = 'completed'),
    2
  ) as avg_distance_per_batch_km,

  ROUND(
    AVG(db.total_quantity) FILTER (WHERE db.status = 'completed'),
    2
  ) as avg_items_per_batch,

  -- Trip data (from vehicle_trips)
  COUNT(DISTINCT vt.id) as total_trips,
  ROUND(SUM(vt.fuel_consumed), 2) as total_fuel_consumed_liters,

  -- Actual fuel efficiency (from trip data)
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0
      THEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)
      ELSE NULL
    END,
    2
  ) as actual_fuel_efficiency_km_per_liter,

  -- Fuel efficiency variance (actual vs rated)
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0 AND v.fuel_efficiency > 0
      THEN (
        (SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)) - v.fuel_efficiency
      ) / v.fuel_efficiency * 100
      ELSE NULL
    END,
    2
  ) as fuel_efficiency_variance_percent,

  -- Odometer tracking
  MIN(vt.start_odometer) FILTER (WHERE vt.start_odometer IS NOT NULL) as first_odometer_reading,
  MAX(vt.end_odometer) FILTER (WHERE vt.end_odometer IS NOT NULL) as last_odometer_reading,

  -- Total odometer distance (calculated from trip data)
  COALESCE(
    MAX(vt.end_odometer) FILTER (WHERE vt.end_odometer IS NOT NULL) -
    MIN(vt.start_odometer) FILTER (WHERE vt.start_odometer IS NOT NULL),
    0
  ) as total_odometer_distance_km,

  -- Maintenance metrics (from vehicle_maintenance)
  COUNT(DISTINCT vm.id) as total_maintenance_events,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'routine') as routine_maintenance_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'repair') as repair_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'emergency') as emergency_maintenance_count,

  -- Maintenance costs
  ROUND(COALESCE(SUM(vm.cost), 0), 2) as total_maintenance_cost,
  ROUND(
    AVG(vm.cost) FILTER (WHERE vm.cost IS NOT NULL),
    2
  ) as avg_maintenance_cost,

  -- Maintenance status
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'scheduled') as scheduled_maintenance_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'in-progress') as maintenance_in_progress_count,

  -- Downtime calculation (maintenance in-progress or vehicle maintenance status)
  CASE
    WHEN v.status = 'maintenance' THEN true
    WHEN COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'in-progress') > 0 THEN true
    ELSE false
  END as currently_in_maintenance,

  -- Cost per kilometer
  ROUND(
    CASE
      WHEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') > 0
      THEN COALESCE(SUM(vm.cost), 0) / SUM(db.total_distance) FILTER (WHERE db.status = 'completed')
      ELSE NULL
    END,
    2
  ) as maintenance_cost_per_km,

  -- Activity tracking
  MAX(db.actual_end_time) as last_batch_completion,
  MAX(vt.end_time) as last_trip_date,
  MAX(vm.scheduled_date) as next_maintenance_date,

  -- Timestamps
  v.created_at as vehicle_created_at,
  v.updated_at as vehicle_updated_at,
  NOW() as metrics_calculated_at

FROM public.vehicles v
LEFT JOIN public.drivers d ON v.current_driver_id = d.id
LEFT JOIN public.delivery_batches db ON db.vehicle_id = v.id
LEFT JOIN public.vehicle_trips vt ON vt.vehicle_id = v.id
LEFT JOIN public.vehicle_maintenance vm ON vm.vehicle_id = v.id
GROUP BY
  v.id,
  v.type,
  v.model,
  v.plate_number,
  v.status,
  v.fuel_type,
  v.capacity,
  v.max_weight,
  v.avg_speed,
  v.fuel_efficiency,
  v.current_driver_id,
  d.name,
  v.created_at,
  v.updated_at;

-- ============================================================================
-- 2. CREATE UNIQUE INDEX FOR CONCURRENT REFRESH
-- ============================================================================

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_vehicle_utilization_vehicle_id_unique
  ON analytics.vehicle_utilization(vehicle_id);

-- ============================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_vehicle_utilization_status
  ON analytics.vehicle_utilization(vehicle_status);

CREATE INDEX idx_vehicle_utilization_type
  ON analytics.vehicle_utilization(vehicle_type);

CREATE INDEX idx_vehicle_utilization_rate
  ON analytics.vehicle_utilization(utilization_rate DESC)
  WHERE utilization_rate IS NOT NULL;

CREATE INDEX idx_vehicle_utilization_fuel_efficiency
  ON analytics.vehicle_utilization(actual_fuel_efficiency_km_per_liter DESC)
  WHERE actual_fuel_efficiency_km_per_liter IS NOT NULL;

CREATE INDEX idx_vehicle_utilization_maintenance_cost
  ON analytics.vehicle_utilization(total_maintenance_cost DESC)
  WHERE total_maintenance_cost > 0;

CREATE INDEX idx_vehicle_utilization_in_maintenance
  ON analytics.vehicle_utilization(currently_in_maintenance)
  WHERE currently_in_maintenance = true;

-- Composite index for common queries (status + utilization rate)
CREATE INDEX idx_vehicle_utilization_status_rate
  ON analytics.vehicle_utilization(vehicle_status, utilization_rate DESC)
  WHERE utilization_rate IS NOT NULL;

-- Composite index for type-based analysis
CREATE INDEX idx_vehicle_utilization_type_efficiency
  ON analytics.vehicle_utilization(vehicle_type, actual_fuel_efficiency_km_per_liter DESC)
  WHERE actual_fuel_efficiency_km_per_liter IS NOT NULL;

-- ============================================================================
-- 4. CREATE REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_vehicle_utilization()
RETURNS trigger AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_vehicle_utilization() IS
  'Refreshes vehicle_utilization materialized view when related tables change';

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger on vehicles table
CREATE TRIGGER trg_refresh_vehicle_utilization_vehicles
AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- Trigger on delivery_batches table (when vehicle assignments change)
CREATE TRIGGER trg_refresh_vehicle_utilization_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- Trigger on vehicle_trips table (when trip data changes)
CREATE TRIGGER trg_refresh_vehicle_utilization_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- Trigger on vehicle_maintenance table (when maintenance data changes)
CREATE TRIGGER trg_refresh_vehicle_utilization_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON analytics.vehicle_utilization TO authenticated, anon;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW analytics.vehicle_utilization IS
  'Phase 2 Analytics: Pre-aggregated vehicle utilization metrics.
   Eliminates client-side aggregation for vehicle analytics dashboards.
   Target query performance: < 100ms for queries.
   Refresh time target: < 5 seconds.

   NOTE: Currently does not include workspace isolation. Will be added
   when workspaces table is implemented in the schema.

   Includes:
   - Utilization rate (completed batches / total assigned batches)
   - Fuel efficiency tracking (actual vs rated)
   - Maintenance costs and frequency
   - Downtime and availability status
   - Distance and delivery volume metrics';

COMMENT ON COLUMN analytics.vehicle_utilization.vehicle_id IS 'Vehicle primary key (unique)';
COMMENT ON COLUMN analytics.vehicle_utilization.vehicle_type IS 'Type of vehicle (van, truck, motorcycle, etc.)';
COMMENT ON COLUMN analytics.vehicle_utilization.plate_number IS 'Vehicle registration plate number';
COMMENT ON COLUMN analytics.vehicle_utilization.vehicle_status IS 'Current vehicle status (available, in_use, in_maintenance, etc.)';
COMMENT ON COLUMN analytics.vehicle_utilization.total_batches_assigned IS 'Total delivery batches assigned to this vehicle';
COMMENT ON COLUMN analytics.vehicle_utilization.completed_batches IS 'Count of batches completed by this vehicle';
COMMENT ON COLUMN analytics.vehicle_utilization.utilization_rate IS 'Percentage of assigned batches that were completed (0-100)';
COMMENT ON COLUMN analytics.vehicle_utilization.total_distance_km IS 'Total distance covered across all completed batches';
COMMENT ON COLUMN analytics.vehicle_utilization.total_items_delivered IS 'Total items delivered across all completed batches';
COMMENT ON COLUMN analytics.vehicle_utilization.total_fuel_consumed_liters IS 'Total fuel consumed across all trips';
COMMENT ON COLUMN analytics.vehicle_utilization.actual_fuel_efficiency_km_per_liter IS 'Actual fuel efficiency from trip data (km/liter)';
COMMENT ON COLUMN analytics.vehicle_utilization.rated_fuel_efficiency IS 'Manufacturer-rated fuel efficiency from vehicles table';
COMMENT ON COLUMN analytics.vehicle_utilization.fuel_efficiency_variance_percent IS 'Difference between actual and rated efficiency as percentage';
COMMENT ON COLUMN analytics.vehicle_utilization.total_maintenance_cost IS 'Sum of all maintenance costs';
COMMENT ON COLUMN analytics.vehicle_utilization.maintenance_cost_per_km IS 'Maintenance cost divided by total distance';
COMMENT ON COLUMN analytics.vehicle_utilization.currently_in_maintenance IS 'TRUE if vehicle is currently undergoing maintenance';
COMMENT ON COLUMN analytics.vehicle_utilization.next_maintenance_date IS 'Date of next scheduled maintenance';
COMMENT ON COLUMN analytics.vehicle_utilization.metrics_calculated_at IS 'Timestamp when metrics were last refreshed';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

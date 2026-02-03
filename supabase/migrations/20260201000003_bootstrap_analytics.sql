-- Bootstrap Analytics Infrastructure
-- Purpose: Create minimal analytics schema and functions to prevent 404 errors
-- This provides a working analytics layer even without full data

-- ============================================================================
-- 1. CREATE ANALYTICS SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;

-- ============================================================================
-- 2. DROP EXISTING OBJECTS (if they exist as different types)
-- Note: Drop regular views first since DROP MATERIALIZED VIEW fails on regular views
-- ============================================================================

DROP VIEW IF EXISTS analytics.driver_efficiency CASCADE;
DROP VIEW IF EXISTS analytics.delivery_performance CASCADE;
DROP VIEW IF EXISTS analytics.vehicle_utilization CASCADE;
DROP VIEW IF EXISTS analytics.cost_analysis CASCADE;

DROP MATERIALIZED VIEW IF EXISTS analytics.driver_efficiency CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.delivery_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.vehicle_utilization CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.cost_analysis CASCADE;

-- ============================================================================
-- 2b. DROP EXISTING FUNCTIONS (if they exist with different signatures)
-- ============================================================================

DROP FUNCTION IF EXISTS analytics.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_driver_kpis();
DROP FUNCTION IF EXISTS analytics.get_vehicle_kpis();
DROP FUNCTION IF EXISTS analytics.get_cost_kpis();
DROP FUNCTION IF EXISTS analytics.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS analytics.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS analytics.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS analytics.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS analytics.get_driver_costs(INTEGER);
DROP FUNCTION IF EXISTS analytics.get_dashboard_summary(DATE, DATE);

-- ============================================================================
-- 3. CREATE STUB VIEWS (will work even without data)
-- ============================================================================

-- Driver efficiency view (simplified version)
CREATE OR REPLACE VIEW analytics.driver_efficiency AS
SELECT
  d.id as driver_id,
  d.name as driver_name,
  d.phone,
  COALESCE(d.license_type::text, 'unknown') as license_type,
  'available'::text as driver_status,
  COALESCE(d.performance_score, 0) as performance_score,
  COALESCE(d.total_deliveries, 0) as total_deliveries,
  COALESCE(d.on_time_percentage, 0) as on_time_percentage,
  d.shift_start,
  d.shift_end,
  d.max_hours,
  0::bigint as completed_batches,
  0::bigint as cancelled_batches,
  0::bigint as total_batches,
  0::bigint as on_time_batches,
  0::bigint as late_batches,
  COALESCE(d.on_time_percentage, 0)::numeric as on_time_rate,
  0::numeric as avg_completion_time_hours,
  0::bigint as total_items_delivered,
  0::numeric as total_distance_km,
  0::bigint as total_trips,
  0::numeric as total_fuel_consumed_liters,
  0::numeric as fuel_efficiency_km_per_liter,
  0::numeric as avg_fuel_per_trip_liters,
  0::bigint as total_incidents,
  NULL::timestamp as last_delivery_date,
  NULL::timestamp as last_trip_date,
  d.created_at as driver_created_at,
  d.updated_at as driver_updated_at,
  NOW() as metrics_calculated_at
FROM public.drivers d;

-- Delivery performance view (simplified version)
CREATE OR REPLACE VIEW analytics.delivery_performance AS
SELECT
  db.id as batch_id,
  db.status,
  db.scheduled_date,
  db.priority,
  db.notes,
  db.driver_id,
  db.vehicle_id,
  NULL::uuid as warehouse_id,
  0::bigint as items_count,
  COALESCE(db.total_quantity, 0) as total_quantity,
  COALESCE(db.total_distance, 0) as total_distance,
  db.actual_start_time,
  db.actual_end_time,
  CASE
    WHEN db.actual_end_time IS NOT NULL AND db.actual_start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600
    ELSE NULL
  END as completion_time_hours,
  true as on_time,
  db.created_at,
  db.updated_at
FROM public.delivery_batches db;

-- Vehicle utilization view (simplified version)
CREATE OR REPLACE VIEW analytics.vehicle_utilization AS
SELECT
  v.id as vehicle_id,
  v.plate_number,
  COALESCE(v.type::text, 'unknown') as vehicle_type,
  v.make,
  v.model,
  COALESCE(v.capacity, 0) as capacity,
  COALESCE(v.status::text, 'available') as vehicle_status,
  0::bigint as total_batches_assigned,
  0::bigint as completed_batches,
  0::numeric as utilization_rate,
  0::numeric as actual_fuel_efficiency_km_per_liter,
  false as currently_in_maintenance,
  0::numeric as total_maintenance_cost,
  0::bigint as maintenance_events,
  NULL::date as last_maintenance_date,
  v.created_at,
  v.updated_at
FROM public.vehicles v;

-- Cost analysis view (simplified version)
CREATE OR REPLACE VIEW analytics.cost_analysis AS
SELECT
  0::numeric as total_system_cost,
  0::numeric as total_maintenance_cost,
  0::numeric as total_fuel_cost,
  0::numeric as avg_cost_per_item,
  0::numeric as avg_cost_per_km,
  (SELECT COUNT(*)::bigint FROM vehicles) as active_vehicles,
  (SELECT COUNT(*)::bigint FROM drivers) as active_drivers,
  0::bigint as total_items_delivered;

-- ============================================================================
-- 3. CREATE ANALYTICS FUNCTIONS (in analytics schema)
-- ============================================================================

-- Get delivery KPIs
CREATE OR REPLACE FUNCTION analytics.get_delivery_kpis(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_batches BIGINT,
  completed_batches BIGINT,
  on_time_batches BIGINT,
  late_batches BIGINT,
  on_time_rate NUMERIC,
  avg_completion_time_hours NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE dp.status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE dp.on_time = true AND dp.status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE dp.on_time = false AND dp.status = 'completed')::BIGINT,
    ROUND(
      CASE
        WHEN COUNT(*) FILTER (WHERE dp.status = 'completed') > 0
        THEN (COUNT(*) FILTER (WHERE dp.on_time = true AND dp.status = 'completed')::NUMERIC /
              COUNT(*) FILTER (WHERE dp.status = 'completed')::NUMERIC) * 100
        ELSE 0
      END, 2
    ),
    ROUND(AVG(dp.completion_time_hours) FILTER (WHERE dp.completion_time_hours IS NOT NULL), 2),
    COALESCE(SUM(dp.items_count), 0)::BIGINT,
    COALESCE(SUM(dp.total_distance), 0)::NUMERIC
  FROM analytics.delivery_performance dp
  WHERE (p_start_date IS NULL OR dp.scheduled_date >= p_start_date)
    AND (p_end_date IS NULL OR dp.scheduled_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get driver KPIs
CREATE OR REPLACE FUNCTION analytics.get_driver_kpis()
RETURNS TABLE (
  total_drivers BIGINT,
  active_drivers BIGINT,
  avg_on_time_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_incidents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE de.total_batches > 0)::BIGINT,
    ROUND(AVG(de.on_time_rate) FILTER (WHERE de.on_time_rate IS NOT NULL), 2),
    ROUND(AVG(de.fuel_efficiency_km_per_liter) FILTER (WHERE de.fuel_efficiency_km_per_liter IS NOT NULL), 2),
    COALESCE(SUM(de.total_incidents), 0)::BIGINT
  FROM analytics.driver_efficiency de;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get vehicle KPIs
CREATE OR REPLACE FUNCTION analytics.get_vehicle_kpis()
RETURNS TABLE (
  total_vehicles BIGINT,
  active_vehicles BIGINT,
  in_maintenance BIGINT,
  avg_utilization_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_maintenance_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE vu.total_batches_assigned > 0)::BIGINT,
    COUNT(*) FILTER (WHERE vu.currently_in_maintenance = true)::BIGINT,
    ROUND(AVG(vu.utilization_rate) FILTER (WHERE vu.utilization_rate IS NOT NULL), 2),
    ROUND(AVG(vu.actual_fuel_efficiency_km_per_liter) FILTER (WHERE vu.actual_fuel_efficiency_km_per_liter IS NOT NULL), 2),
    COALESCE(SUM(vu.total_maintenance_cost), 0)::NUMERIC
  FROM analytics.vehicle_utilization vu;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get cost KPIs
CREATE OR REPLACE FUNCTION analytics.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.total_system_cost,
    ca.total_maintenance_cost,
    ca.total_fuel_cost,
    ca.avg_cost_per_item,
    ca.avg_cost_per_km,
    ca.active_vehicles,
    ca.active_drivers,
    ca.total_items_delivered
  FROM analytics.cost_analysis ca;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get top vehicles by on-time
CREATE OR REPLACE FUNCTION analytics.get_top_vehicles_by_ontime(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  vehicle_id UUID,
  vehicle_number TEXT,
  vehicle_type TEXT,
  on_time_batches BIGINT,
  total_batches BIGINT,
  on_time_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vu.vehicle_id,
    vu.plate_number,
    vu.vehicle_type,
    vu.completed_batches,
    vu.total_batches_assigned,
    vu.utilization_rate
  FROM analytics.vehicle_utilization vu
  ORDER BY vu.utilization_rate DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get top drivers
CREATE OR REPLACE FUNCTION analytics.get_top_drivers(
  metric TEXT DEFAULT 'on_time_rate',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  on_time_rate NUMERIC,
  completed_batches BIGINT,
  total_items_delivered BIGINT,
  fuel_efficiency_km_per_liter NUMERIC,
  total_incidents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.driver_id,
    de.driver_name,
    de.on_time_rate,
    de.completed_batches,
    de.total_items_delivered,
    de.fuel_efficiency_km_per_liter,
    de.total_incidents
  FROM analytics.driver_efficiency de
  ORDER BY
    CASE metric
      WHEN 'on_time_rate' THEN de.on_time_rate
      WHEN 'fuel_efficiency' THEN de.fuel_efficiency_km_per_liter
      WHEN 'deliveries' THEN de.total_items_delivered::numeric
      ELSE de.on_time_rate
    END DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get vehicles needing maintenance
CREATE OR REPLACE FUNCTION analytics.get_vehicles_needing_maintenance()
RETURNS TABLE (
  vehicle_id UUID,
  plate_number TEXT,
  vehicle_type TEXT,
  total_distance_km NUMERIC,
  last_maintenance_date DATE,
  maintenance_in_progress BIGINT,
  total_maintenance_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vu.vehicle_id,
    vu.plate_number,
    vu.vehicle_type,
    0::NUMERIC,
    vu.last_maintenance_date,
    CASE WHEN vu.currently_in_maintenance THEN 1::BIGINT ELSE 0::BIGINT END,
    vu.total_maintenance_cost
  FROM analytics.vehicle_utilization vu
  WHERE vu.currently_in_maintenance = true
     OR vu.last_maintenance_date IS NULL
     OR vu.last_maintenance_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql STABLE;

-- Get vehicle costs
CREATE OR REPLACE FUNCTION analytics.get_vehicle_costs(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  vehicle_id UUID,
  total_cost NUMERIC,
  maintenance_cost NUMERIC,
  fuel_cost NUMERIC,
  fuel_consumed_liters NUMERIC,
  maintenance_events BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vu.vehicle_id,
    vu.total_maintenance_cost,
    vu.total_maintenance_cost,
    0::NUMERIC,
    0::NUMERIC,
    vu.maintenance_events
  FROM analytics.vehicle_utilization vu
  ORDER BY vu.total_maintenance_cost DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get driver costs
CREATE OR REPLACE FUNCTION analytics.get_driver_costs(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  total_cost NUMERIC,
  fuel_cost NUMERIC,
  operational_cost NUMERIC,
  items_delivered BIGINT,
  distance_covered NUMERIC,
  cost_per_item NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.driver_id,
    0::NUMERIC,
    de.total_fuel_consumed_liters,
    0::NUMERIC,
    de.total_items_delivered,
    de.total_distance_km,
    0::NUMERIC
  FROM analytics.driver_efficiency de
  ORDER BY de.total_items_delivered DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get dashboard summary (main function)
CREATE OR REPLACE FUNCTION analytics.get_dashboard_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_deliveries BIGINT,
  on_time_rate NUMERIC,
  avg_completion_hours NUMERIC,
  total_items BIGINT,
  active_vehicles BIGINT,
  vehicle_utilization_rate NUMERIC,
  vehicles_in_maintenance BIGINT,
  active_drivers BIGINT,
  driver_on_time_rate NUMERIC,
  total_incidents BIGINT,
  total_cost NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
) AS $$
DECLARE
  v_delivery RECORD;
  v_vehicle RECORD;
  v_driver RECORD;
  v_cost RECORD;
BEGIN
  -- Get delivery KPIs
  SELECT * INTO v_delivery FROM analytics.get_delivery_kpis(p_start_date, p_end_date);

  -- Get vehicle KPIs
  SELECT * INTO v_vehicle FROM analytics.get_vehicle_kpis();

  -- Get driver KPIs
  SELECT * INTO v_driver FROM analytics.get_driver_kpis();

  -- Get cost KPIs
  SELECT * INTO v_cost FROM analytics.get_cost_kpis();

  RETURN QUERY SELECT
    COALESCE(v_delivery.completed_batches, 0)::BIGINT,
    COALESCE(v_delivery.on_time_rate, 0)::NUMERIC,
    COALESCE(v_delivery.avg_completion_time_hours, 0)::NUMERIC,
    COALESCE(v_delivery.total_items_delivered, 0)::BIGINT,
    COALESCE(v_vehicle.active_vehicles, 0)::BIGINT,
    COALESCE(v_vehicle.avg_utilization_rate, 0)::NUMERIC,
    COALESCE(v_vehicle.in_maintenance, 0)::BIGINT,
    COALESCE(v_driver.active_drivers, 0)::BIGINT,
    COALESCE(v_driver.avg_on_time_rate, 0)::NUMERIC,
    COALESCE(v_driver.total_incidents, 0)::BIGINT,
    COALESCE(v_cost.total_system_cost, 0)::NUMERIC,
    COALESCE(v_cost.avg_cost_per_item, 0)::NUMERIC,
    COALESCE(v_cost.avg_cost_per_km, 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON analytics.driver_efficiency TO authenticated, anon;
GRANT SELECT ON analytics.delivery_performance TO authenticated, anon;
GRANT SELECT ON analytics.vehicle_utilization TO authenticated, anon;
GRANT SELECT ON analytics.cost_analysis TO authenticated, anon;

GRANT EXECUTE ON FUNCTION analytics.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_top_vehicles_by_ontime(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_top_drivers(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicles_needing_maintenance() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

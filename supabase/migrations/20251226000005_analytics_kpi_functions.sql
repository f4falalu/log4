-- Phase 2: Analytics Backend - Ticket A5
-- KPI Aggregation Functions
--
-- Purpose: Create helper functions to query analytics materialized views
--          Provides convenient API for common KPI queries with date filtering
--
-- Performance Target: < 100ms for all function calls
--
-- NOTE: These functions query the pre-aggregated materialized views (A1-A4)
--       ensuring fast performance for dashboard KPIs

-- ============================================================================
-- 1. DELIVERY PERFORMANCE KPIs
-- ============================================================================

-- Get delivery performance KPIs for date range
CREATE OR REPLACE FUNCTION analytics.get_delivery_kpis(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
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
    COUNT(*)::BIGINT as total_batches,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_batches,
    COUNT(*) FILTER (WHERE on_time = true)::BIGINT as on_time_batches,
    COUNT(*) FILTER (WHERE on_time = false)::BIGINT as late_batches,
    ROUND(
      (COUNT(*) FILTER (WHERE on_time = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)::NUMERIC) * 100,
      2
    ) as on_time_rate,
    ROUND(AVG(completion_time_hours) FILTER (WHERE completion_time_hours IS NOT NULL), 2) as avg_completion_time_hours,
    COALESCE(SUM(items_count), 0)::BIGINT as total_items_delivered,
    COALESCE(SUM(total_distance), 0) as total_distance_km
  FROM analytics.delivery_performance
  WHERE (start_date IS NULL OR scheduled_date >= start_date)
    AND (end_date IS NULL OR scheduled_date <= end_date);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_delivery_kpis IS
  'Get delivery performance KPIs for a date range.
   Returns aggregate metrics: total batches, completion rates, on-time performance.
   Parameters:
   - start_date: Optional start date filter
   - end_date: Optional end date filter
   If both dates are NULL, returns all-time metrics.';

-- Get top performing vehicles by on-time rate
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
    dp.vehicle_id,
    dp.vehicle_number,
    dp.vehicle_type,
    COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT as on_time_batches,
    COUNT(*)::BIGINT as total_batches,
    ROUND(
      (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC / COUNT(*)::NUMERIC) * 100,
      2
    ) as on_time_rate
  FROM analytics.delivery_performance dp
  WHERE dp.vehicle_id IS NOT NULL
  GROUP BY dp.vehicle_id, dp.vehicle_number, dp.vehicle_type
  HAVING COUNT(*) >= 5  -- Minimum 5 batches for meaningful stats
  ORDER BY on_time_rate DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_top_vehicles_by_ontime IS
  'Get top performing vehicles ranked by on-time delivery rate.
   Requires minimum 5 batches per vehicle for statistical significance.';

-- ============================================================================
-- 2. DRIVER EFFICIENCY KPIs
-- ============================================================================

-- Get driver efficiency KPIs
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
    COUNT(*)::BIGINT as total_drivers,
    COUNT(*) FILTER (WHERE total_batches > 0)::BIGINT as active_drivers,
    ROUND(AVG(on_time_rate) FILTER (WHERE on_time_rate IS NOT NULL), 2) as avg_on_time_rate,
    ROUND(AVG(fuel_efficiency_km_per_liter) FILTER (WHERE fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(total_incidents), 0)::BIGINT as total_incidents
  FROM analytics.driver_efficiency;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_driver_kpis IS
  'Get overall driver efficiency KPIs.
   Returns: total drivers, active drivers, average on-time rate, fuel efficiency, incidents.';

-- Get top performing drivers
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
  WHERE de.completed_batches >= 5  -- Minimum 5 batches
  ORDER BY
    CASE
      WHEN metric = 'on_time_rate' THEN de.on_time_rate
      WHEN metric = 'fuel_efficiency' THEN de.fuel_efficiency_km_per_liter
      WHEN metric = 'deliveries' THEN de.total_items_delivered::NUMERIC
      ELSE de.on_time_rate
    END DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_top_drivers IS
  'Get top performing drivers by specified metric.
   Parameters:
   - metric: "on_time_rate", "fuel_efficiency", or "deliveries" (default: on_time_rate)
   - limit_count: Number of results (default: 10)';

-- ============================================================================
-- 3. VEHICLE UTILIZATION KPIs
-- ============================================================================

-- Get vehicle utilization KPIs
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
    COUNT(*)::BIGINT as total_vehicles,
    COUNT(*) FILTER (WHERE total_batches_assigned > 0)::BIGINT as active_vehicles,
    COUNT(*) FILTER (WHERE currently_in_maintenance = true)::BIGINT as in_maintenance,
    ROUND(AVG(utilization_rate) FILTER (WHERE utilization_rate IS NOT NULL), 2) as avg_utilization_rate,
    ROUND(AVG(actual_fuel_efficiency_km_per_liter) FILTER (WHERE actual_fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(total_maintenance_cost), 0) as total_maintenance_cost
  FROM analytics.vehicle_utilization;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_vehicle_kpis IS
  'Get overall vehicle utilization KPIs.
   Returns: total vehicles, active vehicles, maintenance status, utilization rate, fuel efficiency, costs.';

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
    vu.total_distance_km,
    vu.next_maintenance_date as last_maintenance_date,
    vu.maintenance_in_progress_count,
    vu.total_maintenance_cost
  FROM analytics.vehicle_utilization vu
  WHERE vu.currently_in_maintenance = false
    AND (
      vu.total_distance_km > 10000  -- Over 10,000 km
      OR vu.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'  -- Maintenance due within 7 days
    )
  ORDER BY vu.total_distance_km DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_vehicles_needing_maintenance IS
  'Get vehicles that need maintenance soon.
   Criteria: Over 10,000km or scheduled maintenance within 7 days.';

-- ============================================================================
-- 4. COST ANALYSIS KPIs
-- ============================================================================

-- Get cost KPIs (single row aggregated view)
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

COMMENT ON FUNCTION analytics.get_cost_kpis IS
  'Get overall cost analysis KPIs.
   Returns single-row summary of all system costs and efficiency metrics.';

-- Get vehicle cost breakdown (extract from JSONB)
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
    (vc->>'vehicle_id')::UUID as vehicle_id,
    (vc->>'total_cost')::NUMERIC as total_cost,
    (vc->>'maintenance_cost')::NUMERIC as maintenance_cost,
    (vc->>'fuel_cost')::NUMERIC as fuel_cost,
    (vc->>'fuel_consumed_liters')::NUMERIC as fuel_consumed_liters,
    (vc->>'maintenance_events')::BIGINT as maintenance_events
  FROM analytics.cost_analysis ca,
       jsonb_array_elements(ca.vehicle_costs) as vc
  ORDER BY (vc->>'total_cost')::NUMERIC DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_vehicle_costs IS
  'Get vehicle cost breakdown sorted by total cost.
   Extracts data from JSONB vehicle_costs array in cost_analysis view.';

-- Get driver cost breakdown (extract from JSONB)
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
    (dc->>'driver_id')::UUID as driver_id,
    (dc->>'total_cost')::NUMERIC as total_cost,
    (dc->>'fuel_cost')::NUMERIC as fuel_cost,
    (dc->>'operational_cost')::NUMERIC as operational_cost,
    (dc->>'items_delivered')::BIGINT as items_delivered,
    (dc->>'distance_covered')::NUMERIC as distance_covered,
    (dc->>'cost_per_item')::NUMERIC as cost_per_item
  FROM analytics.cost_analysis ca,
       jsonb_array_elements(ca.driver_costs) as dc
  ORDER BY (dc->>'total_cost')::NUMERIC DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_driver_costs IS
  'Get driver cost breakdown sorted by total cost.
   Extracts data from JSONB driver_costs array in cost_analysis view.';

-- ============================================================================
-- 5. DASHBOARD SUMMARY KPIs
-- ============================================================================

-- Get complete dashboard summary (combines all KPIs)
CREATE OR REPLACE FUNCTION analytics.get_dashboard_summary(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  -- Delivery metrics
  total_deliveries BIGINT,
  on_time_rate NUMERIC,
  avg_completion_hours NUMERIC,
  total_items BIGINT,

  -- Fleet metrics
  active_vehicles BIGINT,
  vehicle_utilization_rate NUMERIC,
  vehicles_in_maintenance BIGINT,

  -- Driver metrics
  active_drivers BIGINT,
  driver_on_time_rate NUMERIC,
  total_incidents BIGINT,

  -- Cost metrics
  total_cost NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
) AS $$
DECLARE
  delivery_kpis RECORD;
  vehicle_kpis RECORD;
  driver_kpis RECORD;
  cost_kpis RECORD;
BEGIN
  -- Get delivery KPIs
  SELECT * INTO delivery_kpis FROM analytics.get_delivery_kpis(start_date, end_date);

  -- Get vehicle KPIs
  SELECT * INTO vehicle_kpis FROM analytics.get_vehicle_kpis();

  -- Get driver KPIs
  SELECT * INTO driver_kpis FROM analytics.get_driver_kpis();

  -- Get cost KPIs
  SELECT * INTO cost_kpis FROM analytics.get_cost_kpis();

  RETURN QUERY SELECT
    delivery_kpis.completed_batches,
    delivery_kpis.on_time_rate,
    delivery_kpis.avg_completion_time_hours,
    delivery_kpis.total_items_delivered,

    vehicle_kpis.active_vehicles,
    vehicle_kpis.avg_utilization_rate,
    vehicle_kpis.in_maintenance,

    driver_kpis.active_drivers,
    driver_kpis.avg_on_time_rate,
    driver_kpis.total_incidents,

    cost_kpis.total_system_cost,
    cost_kpis.avg_cost_per_item,
    cost_kpis.avg_cost_per_km;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analytics.get_dashboard_summary IS
  'Get complete dashboard summary combining all KPIs.
   Single function call returns all major metrics for dashboard display.
   Parameters:
   - start_date: Optional start date for delivery metrics
   - end_date: Optional end date for delivery metrics';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION analytics.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_top_vehicles_by_ontime(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_top_drivers(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicles_needing_maintenance() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Drop and Recreate All Analytics KPI Functions
--
-- Purpose: Clean slate - drop all existing functions and recreate with proper aliases
--          to avoid any caching or type mismatch issues

-- ============================================================================
-- DROP ALL EXISTING FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS analytics.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_driver_kpis();
DROP FUNCTION IF EXISTS analytics.get_vehicle_kpis();
DROP FUNCTION IF EXISTS analytics.get_cost_kpis();
DROP FUNCTION IF EXISTS analytics.get_dashboard_summary(DATE, DATE);

-- ============================================================================
-- RECREATE: get_delivery_kpis
-- ============================================================================

CREATE FUNCTION analytics.get_delivery_kpis(
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
    COUNT(*)::BIGINT as total_batches,
    COUNT(*) FILTER (WHERE dp.status = 'completed')::BIGINT as completed_batches,
    COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT as on_time_batches,
    COUNT(*) FILTER (WHERE dp.on_time = false)::BIGINT as late_batches,
    ROUND(
      (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE dp.status = 'completed'), 0)::NUMERIC) * 100,
      2
    ) as on_time_rate,
    ROUND(AVG(dp.completion_time_hours) FILTER (WHERE dp.completion_time_hours IS NOT NULL), 2) as avg_completion_time_hours,
    COALESCE(SUM(dp.items_count), 0)::BIGINT as total_items_delivered,
    COALESCE(SUM(dp.total_distance), 0) as total_distance_km
  FROM analytics.delivery_performance dp
  WHERE (p_start_date IS NULL OR dp.scheduled_date >= p_start_date)
    AND (p_end_date IS NULL OR dp.scheduled_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RECREATE: get_driver_kpis
-- ============================================================================

CREATE FUNCTION analytics.get_driver_kpis()
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
    COUNT(*) FILTER (WHERE de.total_batches > 0)::BIGINT as active_drivers,
    ROUND(AVG(de.on_time_rate) FILTER (WHERE de.on_time_rate IS NOT NULL), 2) as avg_on_time_rate,
    ROUND(AVG(de.fuel_efficiency_km_per_liter) FILTER (WHERE de.fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(de.total_incidents), 0)::BIGINT as total_incidents
  FROM analytics.driver_efficiency de;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RECREATE: get_vehicle_kpis
-- ============================================================================

CREATE FUNCTION analytics.get_vehicle_kpis()
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
    COUNT(*) FILTER (WHERE vu.total_batches_assigned > 0)::BIGINT as active_vehicles,
    COUNT(*) FILTER (WHERE vu.currently_in_maintenance = true)::BIGINT as in_maintenance,
    ROUND(AVG(vu.utilization_rate) FILTER (WHERE vu.utilization_rate IS NOT NULL), 2) as avg_utilization_rate,
    ROUND(AVG(vu.actual_fuel_efficiency_km_per_liter) FILTER (WHERE vu.actual_fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(vu.total_maintenance_cost), 0) as total_maintenance_cost
  FROM analytics.vehicle_utilization vu;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RECREATE: get_cost_kpis
-- ============================================================================

CREATE FUNCTION analytics.get_cost_kpis()
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

-- ============================================================================
-- RECREATE: get_dashboard_summary
-- ============================================================================

CREATE FUNCTION analytics.get_dashboard_summary(
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
  v_total_deliveries BIGINT;
  v_on_time_rate NUMERIC;
  v_avg_completion_hours NUMERIC;
  v_total_items BIGINT;
  v_active_vehicles BIGINT;
  v_vehicle_utilization_rate NUMERIC;
  v_vehicles_in_maintenance BIGINT;
  v_active_drivers BIGINT;
  v_driver_on_time_rate NUMERIC;
  v_total_incidents BIGINT;
  v_total_cost NUMERIC;
  v_cost_per_item NUMERIC;
  v_cost_per_km NUMERIC;
BEGIN
  -- Get delivery KPIs
  SELECT
    d.completed_batches,
    d.on_time_rate,
    d.avg_completion_time_hours,
    d.total_items_delivered
  INTO
    v_total_deliveries,
    v_on_time_rate,
    v_avg_completion_hours,
    v_total_items
  FROM analytics.get_delivery_kpis(p_start_date, p_end_date) d;

  -- Get vehicle KPIs
  SELECT
    v.active_vehicles,
    v.avg_utilization_rate,
    v.in_maintenance
  INTO
    v_active_vehicles,
    v_vehicle_utilization_rate,
    v_vehicles_in_maintenance
  FROM analytics.get_vehicle_kpis() v;

  -- Get driver KPIs
  SELECT
    dr.active_drivers,
    dr.avg_on_time_rate,
    dr.total_incidents
  INTO
    v_active_drivers,
    v_driver_on_time_rate,
    v_total_incidents
  FROM analytics.get_driver_kpis() dr;

  -- Get cost KPIs
  SELECT
    c.total_system_cost,
    c.avg_cost_per_item,
    c.avg_cost_per_km
  INTO
    v_total_cost,
    v_cost_per_item,
    v_cost_per_km
  FROM analytics.get_cost_kpis() c;

  -- Return combined results
  RETURN QUERY SELECT
    v_total_deliveries,
    v_on_time_rate,
    v_avg_completion_hours,
    v_total_items,
    v_active_vehicles,
    v_vehicle_utilization_rate,
    v_vehicles_in_maintenance,
    v_active_drivers,
    v_driver_on_time_rate,
    v_total_incidents,
    v_total_cost,
    v_cost_per_item,
    v_cost_per_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION analytics.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

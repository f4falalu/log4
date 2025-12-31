-- Fix Ambiguous Column References in ALL Analytics KPI Functions
--
-- Purpose: Add table aliases to all analytics KPI functions to prevent
--          ambiguity between function output columns and view columns

-- ============================================================================
-- 1. FIX get_delivery_kpis
-- ============================================================================

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
  WHERE (get_delivery_kpis.start_date IS NULL OR dp.scheduled_date >= get_delivery_kpis.start_date)
    AND (get_delivery_kpis.end_date IS NULL OR dp.scheduled_date <= get_delivery_kpis.end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. FIX get_driver_kpis
-- ============================================================================

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
    COUNT(*) FILTER (WHERE de.total_batches > 0)::BIGINT as active_drivers,
    ROUND(AVG(de.on_time_rate) FILTER (WHERE de.on_time_rate IS NOT NULL), 2) as avg_on_time_rate,
    ROUND(AVG(de.fuel_efficiency_km_per_liter) FILTER (WHERE de.fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(de.total_incidents), 0)::BIGINT as total_incidents
  FROM analytics.driver_efficiency de;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. FIX get_vehicle_kpis (already fixed but including for completeness)
-- ============================================================================

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
    COUNT(*) FILTER (WHERE vu.total_batches_assigned > 0)::BIGINT as active_vehicles,
    COUNT(*) FILTER (WHERE vu.currently_in_maintenance = true)::BIGINT as in_maintenance,
    ROUND(AVG(vu.utilization_rate) FILTER (WHERE vu.utilization_rate IS NOT NULL), 2) as avg_utilization_rate,
    ROUND(AVG(vu.actual_fuel_efficiency_km_per_liter) FILTER (WHERE vu.actual_fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(vu.total_maintenance_cost), 0) as total_maintenance_cost
  FROM analytics.vehicle_utilization vu;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. FIX get_cost_kpis
-- ============================================================================

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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION analytics.get_delivery_kpis IS
  'Get delivery performance KPIs for a date range.
   Returns aggregate metrics: total batches, completion rates, on-time performance.
   All column references use table alias to prevent ambiguity.';

COMMENT ON FUNCTION analytics.get_driver_kpis IS
  'Get overall driver efficiency KPIs.
   Returns: total drivers, active drivers, average on-time rate, fuel efficiency, incidents.
   All column references use table alias to prevent ambiguity.';

COMMENT ON FUNCTION analytics.get_vehicle_kpis IS
  'Get overall vehicle utilization KPIs.
   Returns: total vehicles, active vehicles, maintenance status, utilization rate, fuel efficiency, costs.
   All column references use table alias to prevent ambiguity.';

COMMENT ON FUNCTION analytics.get_cost_kpis IS
  'Get overall cost analysis KPIs.
   Returns single-row summary of all system costs and efficiency metrics.
   All column references use table alias to prevent ambiguity.';

-- Fix Ambiguous Column Reference in get_vehicle_kpis
--
-- Purpose: Add table alias to analytics.get_vehicle_kpis() to resolve ambiguity
--          between function output column and view column with same name

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

COMMENT ON FUNCTION analytics.get_vehicle_kpis IS
  'Get overall vehicle utilization KPIs.
   Returns: total vehicles, active vehicles, maintenance status, utilization rate, fuel efficiency, costs.';

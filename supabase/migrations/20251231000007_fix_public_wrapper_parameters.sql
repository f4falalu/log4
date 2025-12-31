-- Fix Public Wrapper Functions Parameter Names
--
-- Purpose: Update public wrapper parameter passing to match renamed analytics function parameters

CREATE OR REPLACE FUNCTION public.get_delivery_kpis(
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
    a.total_batches,
    a.completed_batches,
    a.on_time_batches,
    a.late_batches,
    a.on_time_rate,
    a.avg_completion_time_hours,
    a.total_items_delivered,
    a.total_distance_km
  FROM analytics.get_delivery_kpis(
    p_start_date := get_delivery_kpis.start_date,
    p_end_date := get_delivery_kpis.end_date
  ) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
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
BEGIN
  RETURN QUERY
  SELECT
    a.total_deliveries,
    a.on_time_rate,
    a.avg_completion_hours,
    a.total_items,
    a.active_vehicles,
    a.vehicle_utilization_rate,
    a.vehicles_in_maintenance,
    a.active_drivers,
    a.driver_on_time_rate,
    a.total_incidents,
    a.total_cost,
    a.cost_per_item,
    a.cost_per_km
  FROM analytics.get_dashboard_summary(
    p_start_date := get_dashboard_summary.start_date,
    p_end_date := get_dashboard_summary.end_date
  ) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

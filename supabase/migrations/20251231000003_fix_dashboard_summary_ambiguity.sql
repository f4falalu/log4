-- Fix Ambiguous Column Reference in get_dashboard_summary
--
-- Purpose: Replace SELECT * INTO with explicit column lists to avoid ambiguity

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
  FROM analytics.get_delivery_kpis(start_date, end_date) d;

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

COMMENT ON FUNCTION analytics.get_dashboard_summary IS
  'Get complete dashboard summary combining all KPIs.
   Single function call returns all major metrics for dashboard display.
   Parameters:
   - start_date: Optional start date for delivery metrics
   - end_date: Optional end date for delivery metrics';

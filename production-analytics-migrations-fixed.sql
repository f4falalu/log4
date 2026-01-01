-- Production Analytics Migrations - Fixed Version
-- Combines all analytics migrations with proper DROP statements

-- ============================================================================
-- STEP 1: Drop all existing functions first
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_kpis();
DROP FUNCTION IF EXISTS public.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_vehicle_kpis();
DROP FUNCTION IF EXISTS public.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS public.get_cost_kpis();
DROP FUNCTION IF EXISTS public.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_costs(INTEGER);

DROP FUNCTION IF EXISTS analytics.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_driver_kpis();
DROP FUNCTION IF EXISTS analytics.get_vehicle_kpis();
DROP FUNCTION IF EXISTS analytics.get_cost_kpis();
DROP FUNCTION IF EXISTS analytics.get_dashboard_summary(DATE, DATE);

-- ============================================================================
-- STEP 2: Refresh materialized views
-- ============================================================================

REFRESH MATERIALIZED VIEW analytics.delivery_performance;
REFRESH MATERIALIZED VIEW analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW analytics.cost_analysis;

-- ============================================================================
-- STEP 3: Create analytics schema functions with proper parameter names
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

CREATE FUNCTION analytics.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered NUMERIC
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

  SELECT
    v.active_vehicles,
    v.avg_utilization_rate,
    v.in_maintenance
  INTO
    v_active_vehicles,
    v_vehicle_utilization_rate,
    v_vehicles_in_maintenance
  FROM analytics.get_vehicle_kpis() v;

  SELECT
    dr.active_drivers,
    dr.avg_on_time_rate,
    dr.total_incidents
  INTO
    v_active_drivers,
    v_driver_on_time_rate,
    v_total_incidents
  FROM analytics.get_driver_kpis() dr;

  SELECT
    c.total_system_cost,
    c.avg_cost_per_item,
    c.avg_cost_per_km
  INTO
    v_total_cost,
    v_cost_per_item,
    v_cost_per_km
  FROM analytics.get_cost_kpis() c;

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

GRANT EXECUTE ON FUNCTION analytics.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

-- ============================================================================
-- STEP 4: Create public schema wrappers
-- ============================================================================

CREATE FUNCTION public.get_delivery_kpis(
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

CREATE FUNCTION public.get_top_vehicles_by_ontime(
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
  RETURN QUERY SELECT * FROM analytics.get_top_vehicles_by_ontime(limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_driver_kpis()
RETURNS TABLE (
  total_drivers BIGINT,
  active_drivers BIGINT,
  avg_on_time_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_incidents BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_driver_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_top_drivers(
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
  RETURN QUERY SELECT * FROM analytics.get_top_drivers(metric, limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_vehicle_kpis()
RETURNS TABLE (
  total_vehicles BIGINT,
  active_vehicles BIGINT,
  in_maintenance BIGINT,
  avg_utilization_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_maintenance_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_vehicle_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_vehicles_needing_maintenance()
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
  RETURN QUERY SELECT * FROM analytics.get_vehicles_needing_maintenance();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_cost_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_vehicle_costs(
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
  RETURN QUERY SELECT * FROM analytics.get_vehicle_costs(limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_driver_costs(
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
  RETURN QUERY SELECT * FROM analytics.get_driver_costs(limit_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION public.get_dashboard_summary(
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

GRANT EXECUTE ON FUNCTION public.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_vehicles_by_ontime(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_drivers(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_vehicles_needing_maintenance() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_vehicle_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_costs(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

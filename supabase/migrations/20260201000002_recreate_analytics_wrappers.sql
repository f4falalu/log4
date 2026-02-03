-- Recreate Analytics Public Wrappers
-- Purpose: Drop and recreate public wrapper functions with correct signatures
-- Fixes: ERROR 42P13 - cannot change return type of existing function

-- ============================================================================
-- 1. DROP ALL EXISTING PUBLIC WRAPPERS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_kpis();
DROP FUNCTION IF EXISTS public.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_vehicle_kpis();
DROP FUNCTION IF EXISTS public.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS public.get_cost_kpis();
DROP FUNCTION IF EXISTS public.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(DATE, DATE);

-- ============================================================================
-- 2. DELIVERY PERFORMANCE WRAPPERS
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
  RETURN QUERY SELECT * FROM analytics.get_delivery_kpis(start_date, end_date);
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

-- ============================================================================
-- 3. DRIVER EFFICIENCY WRAPPERS
-- ============================================================================

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

-- ============================================================================
-- 4. VEHICLE UTILIZATION WRAPPERS
-- ============================================================================

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

-- ============================================================================
-- 5. COST ANALYSIS WRAPPERS
-- ============================================================================

CREATE FUNCTION public.get_cost_kpis()
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

-- ============================================================================
-- 6. DASHBOARD SUMMARY WRAPPER
-- ============================================================================

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
  FROM analytics.get_dashboard_summary(start_date, end_date) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

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

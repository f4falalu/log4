-- Analytics Public Schema Wrappers
--
-- Purpose: Create public schema wrapper functions that call analytics schema functions
-- Reason: Supabase RPC only supports calling functions in 'public' schema
--
-- This migration creates thin wrapper functions in the public schema that
-- delegate to the actual analytics functions in the analytics schema.

-- ============================================================================
-- 1. DELIVERY PERFORMANCE WRAPPERS
-- ============================================================================

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
  RETURN QUERY SELECT * FROM analytics.get_delivery_kpis(start_date, end_date);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_top_vehicles_by_ontime(
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
-- 2. DRIVER EFFICIENCY WRAPPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_driver_kpis()
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

CREATE OR REPLACE FUNCTION public.get_top_drivers(
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
-- 3. VEHICLE UTILIZATION WRAPPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_kpis()
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

CREATE OR REPLACE FUNCTION public.get_vehicles_needing_maintenance()
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
-- 4. COST ANALYSIS WRAPPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cost_kpis()
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

CREATE OR REPLACE FUNCTION public.get_vehicle_costs(
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

CREATE OR REPLACE FUNCTION public.get_driver_costs(
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
-- 5. DASHBOARD SUMMARY WRAPPER
-- ============================================================================

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
  FROM analytics.get_dashboard_summary(start_date, end_date) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. GRANT PERMISSIONS
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_delivery_kpis IS 'Public wrapper for analytics.get_delivery_kpis';
COMMENT ON FUNCTION public.get_top_vehicles_by_ontime IS 'Public wrapper for analytics.get_top_vehicles_by_ontime';
COMMENT ON FUNCTION public.get_driver_kpis IS 'Public wrapper for analytics.get_driver_kpis';
COMMENT ON FUNCTION public.get_top_drivers IS 'Public wrapper for analytics.get_top_drivers';
COMMENT ON FUNCTION public.get_vehicle_kpis IS 'Public wrapper for analytics.get_vehicle_kpis';
COMMENT ON FUNCTION public.get_vehicles_needing_maintenance IS 'Public wrapper for analytics.get_vehicles_needing_maintenance';
COMMENT ON FUNCTION public.get_cost_kpis IS 'Public wrapper for analytics.get_cost_kpis';
COMMENT ON FUNCTION public.get_vehicle_costs IS 'Public wrapper for analytics.get_vehicle_costs';
COMMENT ON FUNCTION public.get_driver_costs IS 'Public wrapper for analytics.get_driver_costs';
COMMENT ON FUNCTION public.get_dashboard_summary IS 'Public wrapper for analytics.get_dashboard_summary';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Refresh Analytics Materialized Views
--
-- Purpose: Refresh all analytics materialized views to ensure they have current data
--          and to resolve any potential initialization issues

-- Refresh all analytics views (without CONCURRENTLY since they're new/empty)
REFRESH MATERIALIZED VIEW analytics.delivery_performance;
REFRESH MATERIALIZED VIEW analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW analytics.cost_analysis;

-- Verify views are accessible
DO $$
DECLARE
  dp_count INTEGER;
  de_count INTEGER;
  vu_count INTEGER;
  ca_count INTEGER;
BEGIN
  -- Test that all views can be queried
  SELECT COUNT(*) INTO dp_count FROM analytics.delivery_performance;
  SELECT COUNT(*) INTO de_count FROM analytics.driver_efficiency;
  SELECT COUNT(*) INTO vu_count FROM analytics.vehicle_utilization;
  SELECT COUNT(*) INTO ca_count FROM analytics.cost_analysis;

  RAISE NOTICE 'Analytics views refreshed successfully:';
  RAISE NOTICE '  - delivery_performance: % rows', dp_count;
  RAISE NOTICE '  - driver_efficiency: % rows', de_count;
  RAISE NOTICE '  - vehicle_utilization: % rows', vu_count;
  RAISE NOTICE '  - cost_analysis: % rows', ca_count;
END $$;
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
-- Fix get_cost_kpis Return Type Mismatch
--
-- Purpose: Change total_items_delivered from BIGINT to NUMERIC to match cost_analysis view

DROP FUNCTION IF EXISTS analytics.get_cost_kpis();

CREATE FUNCTION analytics.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered NUMERIC  -- Changed from BIGINT to NUMERIC
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

GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;

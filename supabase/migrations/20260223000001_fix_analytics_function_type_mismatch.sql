-- =====================================================
-- Fix Analytics Function Return Type Mismatches
-- =====================================================
-- Problem: "structure of query does not match function result type"
-- when calling get_dashboard_summary.
--
-- Root cause: Materialized view columns (from nested SUM/COALESCE)
-- return NUMERIC, but functions declare BIGINT return types.
-- PostgreSQL requires exact type matches in RETURNS TABLE functions.
--
-- Fix: Drop and recreate all analytics functions with explicit
-- type casts to ensure exact type compatibility.
-- =====================================================

-- =====================================================
-- 1. DROP ALL EXISTING FUNCTIONS
-- =====================================================

-- Public wrappers
DROP FUNCTION IF EXISTS public.get_dashboard_summary(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_cost_kpis();
DROP FUNCTION IF EXISTS public.get_vehicle_kpis();
DROP FUNCTION IF EXISTS public.get_driver_kpis();
DROP FUNCTION IF EXISTS public.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS public.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS public.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_costs(INTEGER);

-- Analytics schema functions
DROP FUNCTION IF EXISTS analytics.get_dashboard_summary(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_cost_kpis();
DROP FUNCTION IF EXISTS analytics.get_vehicle_kpis();
DROP FUNCTION IF EXISTS analytics.get_driver_kpis();
DROP FUNCTION IF EXISTS analytics.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS analytics.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS analytics.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS analytics.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS analytics.get_driver_costs(INTEGER);

-- =====================================================
-- 2. RECREATE ANALYTICS SCHEMA FUNCTIONS
-- =====================================================

-- get_delivery_kpis
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
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE dp.status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT,
    COUNT(*) FILTER (WHERE dp.on_time = false)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE dp.status = 'completed'), 0)::NUMERIC) * 100,
      2
    ),
    ROUND(AVG(dp.completion_time_hours) FILTER (WHERE dp.completion_time_hours IS NOT NULL), 2),
    COALESCE(SUM(dp.items_count), 0)::BIGINT,
    COALESCE(SUM(dp.total_distance), 0)::NUMERIC
  FROM analytics.delivery_performance dp
  WHERE (p_start_date IS NULL OR dp.scheduled_date >= p_start_date)
    AND (p_end_date IS NULL OR dp.scheduled_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- get_top_vehicles_by_ontime
CREATE FUNCTION analytics.get_top_vehicles_by_ontime(
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
    COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT,
    COUNT(*)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC /
       NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    )
  FROM analytics.delivery_performance dp
  WHERE dp.vehicle_id IS NOT NULL
    AND dp.status = 'completed'
  GROUP BY dp.vehicle_id, dp.vehicle_number, dp.vehicle_type
  ORDER BY 6 DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_driver_kpis
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
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE de.total_batches > 0)::BIGINT,
    ROUND(AVG(de.on_time_rate) FILTER (WHERE de.on_time_rate IS NOT NULL), 2),
    ROUND(AVG(de.fuel_efficiency_km_per_liter) FILTER (WHERE de.fuel_efficiency_km_per_liter IS NOT NULL), 2),
    COALESCE(SUM(de.total_incidents), 0)::BIGINT
  FROM analytics.driver_efficiency de;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_top_drivers
CREATE FUNCTION analytics.get_top_drivers(
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
    de.completed_batches::BIGINT,
    COALESCE(de.total_items_delivered, 0)::BIGINT,
    de.fuel_efficiency_km_per_liter,
    de.total_incidents::BIGINT
  FROM analytics.driver_efficiency de
  WHERE de.total_batches > 0
  ORDER BY
    CASE metric
      WHEN 'on_time_rate' THEN de.on_time_rate
      WHEN 'fuel_efficiency' THEN de.fuel_efficiency_km_per_liter
      WHEN 'deliveries' THEN de.completed_batches::NUMERIC
      ELSE de.on_time_rate
    END DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_vehicle_kpis
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
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE vu.total_batches_assigned > 0)::BIGINT,
    COUNT(*) FILTER (WHERE vu.currently_in_maintenance = true)::BIGINT,
    ROUND(AVG(vu.utilization_rate) FILTER (WHERE vu.utilization_rate IS NOT NULL), 2),
    ROUND(AVG(vu.actual_fuel_efficiency_km_per_liter) FILTER (WHERE vu.actual_fuel_efficiency_km_per_liter IS NOT NULL), 2),
    COALESCE(SUM(vu.total_maintenance_cost), 0)::NUMERIC
  FROM analytics.vehicle_utilization vu;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_vehicles_needing_maintenance
CREATE FUNCTION analytics.get_vehicles_needing_maintenance()
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
    COALESCE(vu.total_distance_km, 0)::NUMERIC,
    vu.next_maintenance_date,
    vu.maintenance_in_progress_count::BIGINT,
    COALESCE(vu.total_maintenance_cost, 0)::NUMERIC
  FROM analytics.vehicle_utilization vu
  WHERE vu.currently_in_maintenance = false
    AND (
      vu.total_distance_km > 10000
      OR vu.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'
    )
  ORDER BY vu.total_distance_km DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_cost_kpis (KEY FIX: explicit casts for BIGINT columns)
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
    COALESCE(ca.total_system_cost, 0)::NUMERIC,
    COALESCE(ca.total_maintenance_cost, 0)::NUMERIC,
    COALESCE(ca.total_fuel_cost, 0)::NUMERIC,
    COALESCE(ca.avg_cost_per_item, 0)::NUMERIC,
    COALESCE(ca.avg_cost_per_km, 0)::NUMERIC,
    COALESCE(ca.active_vehicles, 0)::BIGINT,
    COALESCE(ca.active_drivers, 0)::BIGINT,
    COALESCE(ca.total_items_delivered, 0)::BIGINT
  FROM analytics.cost_analysis ca;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_vehicle_costs
CREATE FUNCTION analytics.get_vehicle_costs(
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
    (vc->>'vehicle_id')::UUID,
    (vc->>'total_cost')::NUMERIC,
    (vc->>'maintenance_cost')::NUMERIC,
    (vc->>'fuel_cost')::NUMERIC,
    (vc->>'fuel_consumed_liters')::NUMERIC,
    (vc->>'maintenance_events')::BIGINT
  FROM analytics.cost_analysis ca,
       jsonb_array_elements(ca.vehicle_costs) as vc
  ORDER BY (vc->>'total_cost')::NUMERIC DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_driver_costs
CREATE FUNCTION analytics.get_driver_costs(
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
    (dc->>'driver_id')::UUID,
    (dc->>'total_cost')::NUMERIC,
    (dc->>'fuel_cost')::NUMERIC,
    (dc->>'operational_cost')::NUMERIC,
    (dc->>'items_delivered')::BIGINT,
    (dc->>'distance_covered')::NUMERIC,
    (dc->>'cost_per_item')::NUMERIC
  FROM analytics.cost_analysis ca,
       jsonb_array_elements(ca.driver_costs) as dc
  ORDER BY (dc->>'total_cost')::NUMERIC DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_dashboard_summary
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
  SELECT d.completed_batches, d.on_time_rate, d.avg_completion_time_hours, d.total_items_delivered
  INTO v_total_deliveries, v_on_time_rate, v_avg_completion_hours, v_total_items
  FROM analytics.get_delivery_kpis(p_start_date, p_end_date) d;

  -- Get vehicle KPIs
  SELECT v.active_vehicles, v.avg_utilization_rate, v.in_maintenance
  INTO v_active_vehicles, v_vehicle_utilization_rate, v_vehicles_in_maintenance
  FROM analytics.get_vehicle_kpis() v;

  -- Get driver KPIs
  SELECT dr.active_drivers, dr.avg_on_time_rate, dr.total_incidents
  INTO v_active_drivers, v_driver_on_time_rate, v_total_incidents
  FROM analytics.get_driver_kpis() dr;

  -- Get cost KPIs
  SELECT c.total_system_cost, c.avg_cost_per_item, c.avg_cost_per_km
  INTO v_total_cost, v_cost_per_item, v_cost_per_km
  FROM analytics.get_cost_kpis() c;

  -- Handle NULL values from empty tables
  RETURN QUERY SELECT
    COALESCE(v_total_deliveries, 0)::BIGINT,
    COALESCE(v_on_time_rate, 0)::NUMERIC,
    COALESCE(v_avg_completion_hours, 0)::NUMERIC,
    COALESCE(v_total_items, 0)::BIGINT,
    COALESCE(v_active_vehicles, 0)::BIGINT,
    COALESCE(v_vehicle_utilization_rate, 0)::NUMERIC,
    COALESCE(v_vehicles_in_maintenance, 0)::BIGINT,
    COALESCE(v_active_drivers, 0)::BIGINT,
    COALESCE(v_driver_on_time_rate, 0)::NUMERIC,
    COALESCE(v_total_incidents, 0)::BIGINT,
    COALESCE(v_total_cost, 0)::NUMERIC,
    COALESCE(v_cost_per_item, 0)::NUMERIC,
    COALESCE(v_cost_per_km, 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 3. RECREATE PUBLIC WRAPPER FUNCTIONS
-- =====================================================

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
    a.total_deliveries, a.on_time_rate, a.avg_completion_hours, a.total_items,
    a.active_vehicles, a.vehicle_utilization_rate, a.vehicles_in_maintenance,
    a.active_drivers, a.driver_on_time_rate, a.total_incidents,
    a.total_cost, a.cost_per_item, a.cost_per_km
  FROM analytics.get_dashboard_summary(start_date, end_date) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Analytics schema functions
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

-- Public wrapper functions
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

-- =====================================================
-- 5. REFRESH MATERIALIZED VIEWS
-- =====================================================

-- Refresh all analytics materialized views to ensure data is current
DO $$
BEGIN
  -- Use CONCURRENTLY where possible (requires unique index)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
  -- cost_analysis doesn't have a unique index, refresh without CONCURRENTLY
  REFRESH MATERIALIZED VIEW analytics.cost_analysis;
  RAISE NOTICE 'All analytics materialized views refreshed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Warning: Could not refresh some materialized views: %', SQLERRM;
END $$;

-- =====================================================
-- COMPLETE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Analytics function type mismatch fix applied successfully!';
  RAISE NOTICE 'All functions now use explicit type casts for BIGINT/NUMERIC';
  RAISE NOTICE 'All COALESCE wrappers added to handle empty tables gracefully';
  RAISE NOTICE '=============================================================';
END $$;

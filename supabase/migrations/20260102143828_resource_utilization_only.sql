-- Resource Utilization Analytics Functions Fix
-- This migration adds the missing analytics functions that were causing 404 errors

-- Create analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS analytics;

-- =============================================
-- 1. Vehicle Payload Utilization
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_vehicle_payload_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id UUID,
  plate_number TEXT,
  vehicle_type TEXT,
  vehicle_capacity_kg DECIMAL,
  max_weight_kg INTEGER,
  total_deliveries BIGINT,
  total_items_delivered BIGINT,
  total_weight_kg NUMERIC,
  avg_payload_utilization_pct NUMERIC,
  avg_weight_utilization_pct NUMERIC,
  max_payload_utilization_pct NUMERIC,
  max_weight_utilization_pct NUMERIC,
  underutilized_deliveries BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH delivery_utilization AS (
    SELECT
      db.vehicle_id,
      v.plate_number,
      v.type::TEXT as vehicle_type,
      v.capacity as vehicle_capacity_kg,
      v.max_weight as max_weight_kg,
      db.id as batch_id,
      db.total_quantity,
      db.total_weight,

      -- Payload utilization (items vs capacity)
      CASE
        WHEN v.capacity > 0 THEN
          ROUND((db.total_quantity::NUMERIC / v.capacity) * 100, 2)
        ELSE 0
      END as payload_util_pct,

      -- Weight utilization (actual weight vs max weight)
      CASE
        WHEN v.max_weight > 0 AND db.total_weight IS NOT NULL THEN
          ROUND((db.total_weight::NUMERIC / v.max_weight) * 100, 2)
        ELSE NULL
      END as weight_util_pct

    FROM delivery_batches db
    JOIN vehicles v ON db.vehicle_id = v.id
    WHERE db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
      AND (p_vehicle_id IS NULL OR db.vehicle_id = p_vehicle_id)
      AND v.deleted_at IS NULL
  )
  SELECT
    du.vehicle_id,
    du.plate_number,
    du.vehicle_type,
    du.vehicle_capacity_kg,
    du.max_weight_kg,
    COUNT(*)::BIGINT as total_deliveries,
    SUM(du.total_quantity)::BIGINT as total_items_delivered,
    SUM(du.total_weight)::NUMERIC as total_weight_kg,
    ROUND(AVG(du.payload_util_pct), 2) as avg_payload_utilization_pct,
    ROUND(AVG(du.weight_util_pct), 2) as avg_weight_utilization_pct,
    ROUND(MAX(du.payload_util_pct), 2) as max_payload_utilization_pct,
    ROUND(MAX(du.weight_util_pct), 2) as max_weight_utilization_pct,
    COUNT(*) FILTER (WHERE du.payload_util_pct < 70)::BIGINT as underutilized_deliveries
  FROM delivery_utilization du
  GROUP BY du.vehicle_id, du.plate_number, du.vehicle_type, du.vehicle_capacity_kg, du.max_weight_kg
  ORDER BY avg_payload_utilization_pct DESC NULLS LAST;
END;
$$;

-- =============================================
-- 2. Program Performance
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_program_performance(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_facilities_served BIGINT,
  total_items_delivered BIGINT,
  avg_items_per_delivery NUMERIC,
  on_time_deliveries BIGINT,
  on_time_rate_pct NUMERIC,
  total_distance_km NUMERIC,
  avg_distance_per_delivery_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH program_deliveries AS (
    SELECT
      f.programme,
      db.id as batch_id,
      db.total_quantity,
      db.total_distance,
      CASE
        WHEN db.actual_end_time <= (db.scheduled_date + db.scheduled_time)::TIMESTAMPTZ
        THEN 1
        ELSE 0
      END as is_on_time,
      facility_id
    FROM delivery_batches db
    CROSS JOIN LATERAL unnest(db.facility_ids) as facility_id
    JOIN facilities f ON f.id = facility_id
    WHERE db.status = 'completed'
      AND f.programme IS NOT NULL
      AND f.deleted_at IS NULL
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
  )
  SELECT
    pd.programme::TEXT,
    COUNT(DISTINCT pd.batch_id)::BIGINT as total_deliveries,
    COUNT(DISTINCT pd.facility_id)::BIGINT as total_facilities_served,
    SUM(pd.total_quantity)::BIGINT as total_items_delivered,
    ROUND(AVG(pd.total_quantity), 2) as avg_items_per_delivery,
    SUM(pd.is_on_time)::BIGINT as on_time_deliveries,
    ROUND((SUM(pd.is_on_time)::NUMERIC / NULLIF(COUNT(DISTINCT pd.batch_id), 0)) * 100, 2) as on_time_rate_pct,
    SUM(pd.total_distance)::NUMERIC as total_distance_km,
    ROUND(AVG(pd.total_distance), 2) as avg_distance_per_delivery_km
  FROM program_deliveries pd
  GROUP BY pd.programme
  ORDER BY total_deliveries DESC;
END;
$$;

-- =============================================
-- 3. Driver Utilization
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_driver_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  total_deliveries BIGINT,
  avg_deliveries_per_week NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC,
  avg_items_per_delivery NUMERIC,
  utilization_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT
      COALESCE(p_start_date, CURRENT_DATE - 30) as start_date,
      COALESCE(p_end_date, CURRENT_DATE) as end_date
  ),
  driver_stats AS (
    SELECT
      d.id as driver_id,
      d.name as driver_name,
      COUNT(db.id) as total_dels,
      SUM(db.total_quantity) as total_items,
      SUM(db.total_distance) as total_dist,
      EXTRACT(EPOCH FROM ((SELECT end_date FROM date_range) - (SELECT start_date FROM date_range))) / 604800.0 as weeks
    FROM drivers d
    LEFT JOIN delivery_batches db ON d.id = db.driver_id
      AND db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name
  )
  SELECT
    ds.driver_id,
    ds.driver_name,
    ds.total_dels::BIGINT as total_deliveries,
    ROUND(ds.total_dels / NULLIF(ds.weeks, 0), 2) as avg_deliveries_per_week,
    ds.total_items::BIGINT as total_items_delivered,
    ds.total_dist::NUMERIC as total_distance_km,
    ROUND(ds.total_items / NULLIF(ds.total_dels, 0), 2) as avg_items_per_delivery,
    CASE
      WHEN ds.total_dels / NULLIF(ds.weeks, 0) >= 10 THEN 'High'
      WHEN ds.total_dels / NULLIF(ds.weeks, 0) >= 5 THEN 'Medium'
      WHEN ds.total_dels / NULLIF(ds.weeks, 0) >= 2 THEN 'Low'
      ELSE 'Underutilized'
    END::TEXT as utilization_status
  FROM driver_stats ds
  ORDER BY ds.total_dels DESC;
END;
$$;

-- =============================================
-- 4. Route Efficiency
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_route_efficiency(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  vehicle_plate TEXT,
  estimated_distance_km DECIMAL,
  actual_distance_km DECIMAL,
  distance_variance_pct NUMERIC,
  estimated_duration_min INTEGER,
  actual_duration_min NUMERIC,
  duration_variance_pct NUMERIC,
  efficiency_rating TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH route_comparison AS (
    SELECT
      db.id as batch_id,
      db.name as batch_name,
      v.plate_number as vehicle_plate,
      db.total_distance as actual_dist,
      db.total_distance as estimated_dist,  -- Using same field for now
      db.estimated_duration as estimated_dur,
      EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 60.0 as actual_dur_min
    FROM delivery_batches db
    JOIN vehicles v ON db.vehicle_id = v.id
    WHERE db.status = 'completed'
      AND db.actual_start_time IS NOT NULL
      AND db.actual_end_time IS NOT NULL
      AND db.estimated_duration IS NOT NULL
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
      AND v.deleted_at IS NULL
  )
  SELECT
    rc.batch_id,
    rc.batch_name,
    rc.vehicle_plate,
    rc.estimated_dist::DECIMAL as estimated_distance_km,
    rc.actual_dist::DECIMAL as actual_distance_km,
    ROUND(((rc.actual_dist - rc.estimated_dist) / NULLIF(rc.estimated_dist, 0)) * 100, 2) as distance_variance_pct,
    rc.estimated_dur::INTEGER as estimated_duration_min,
    ROUND(rc.actual_dur_min, 2) as actual_duration_min,
    ROUND(((rc.actual_dur_min - rc.estimated_dur) / NULLIF(rc.estimated_dur, 0)) * 100, 2) as duration_variance_pct,
    CASE
      WHEN ABS((rc.actual_dur_min - rc.estimated_dur) / NULLIF(rc.estimated_dur, 0)) <= 0.10 THEN 'Excellent'
      WHEN ABS((rc.actual_dur_min - rc.estimated_dur) / NULLIF(rc.estimated_dur, 0)) <= 0.25 THEN 'Good'
      WHEN ABS((rc.actual_dur_min - rc.estimated_dur) / NULLIF(rc.estimated_dur, 0)) <= 0.50 THEN 'Fair'
      ELSE 'Poor'
    END::TEXT as efficiency_rating
  FROM route_comparison rc
  ORDER BY ABS(duration_variance_pct) DESC NULLS LAST;
END;
$$;

-- =============================================
-- 5. Facility Coverage
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_facility_coverage(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_programme TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_facilities BIGINT,
  facilities_served BIGINT,
  facilities_not_served BIGINT,
  coverage_pct NUMERIC,
  programme TEXT,
  program_total_facilities BIGINT,
  program_facilities_served BIGINT,
  program_coverage_pct NUMERIC,
  unserved_facility_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH facilities_in_scope AS (
    SELECT id, name, programme
    FROM facilities
    WHERE deleted_at IS NULL
      AND (p_programme IS NULL OR programme = p_programme)
  ),
  served_facilities AS (
    SELECT DISTINCT unnest(db.facility_ids) as facility_id
    FROM delivery_batches db
    WHERE db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
  ),
  overall_stats AS (
    SELECT
      COUNT(f.id)::BIGINT as total_fac,
      COUNT(sf.facility_id)::BIGINT as served_fac,
      (COUNT(f.id) - COUNT(sf.facility_id))::BIGINT as not_served_fac,
      ROUND((COUNT(sf.facility_id)::NUMERIC / NULLIF(COUNT(f.id), 0)) * 100, 2) as cov_pct
    FROM facilities_in_scope f
    LEFT JOIN served_facilities sf ON f.id = sf.facility_id
  ),
  program_stats AS (
    SELECT
      f.programme,
      COUNT(f.id)::BIGINT as prog_total,
      COUNT(sf.facility_id)::BIGINT as prog_served,
      ROUND((COUNT(sf.facility_id)::NUMERIC / NULLIF(COUNT(f.id), 0)) * 100, 2) as prog_cov_pct
    FROM facilities_in_scope f
    LEFT JOIN served_facilities sf ON f.id = sf.facility_id
    WHERE f.programme IS NOT NULL
    GROUP BY f.programme
  ),
  unserved_list AS (
    SELECT ARRAY_AGG(f.name ORDER BY f.name) as unserved_names
    FROM facilities_in_scope f
    LEFT JOIN served_facilities sf ON f.id = sf.facility_id
    WHERE sf.facility_id IS NULL
  )
  SELECT
    os.total_fac,
    os.served_fac,
    os.not_served_fac,
    os.cov_pct,
    ps.programme::TEXT,
    ps.prog_total,
    ps.prog_served,
    ps.prog_cov_pct,
    ul.unserved_names
  FROM overall_stats os
  CROSS JOIN program_stats ps
  CROSS JOIN unserved_list ul
  ORDER BY ps.prog_total DESC;
END;
$$;

-- =============================================
-- 6. Cost by Program
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_cost_by_program(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_fuel_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_cost NUMERIC,
  cost_per_delivery NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH program_deliveries AS (
    SELECT
      f.programme,
      db.id as batch_id,
      db.total_quantity,
      db.total_distance,
      vt.id as trip_id
    FROM delivery_batches db
    CROSS JOIN LATERAL unnest(db.facility_ids) as facility_id
    JOIN facilities f ON f.id = facility_id
    LEFT JOIN vehicle_trips vt ON vt.batch_id = db.id
    WHERE db.status = 'completed'
      AND f.programme IS NOT NULL
      AND f.deleted_at IS NULL
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
  ),
  fuel_costs AS (
    SELECT
      pd.programme,
      pd.batch_id,
      COALESCE(SUM(vt.fuel_consumed * 1000), 0) as fuel_cost  -- Using placeholder fuel price of 1000
    FROM program_deliveries pd
    LEFT JOIN vehicle_trips vt ON vt.id = pd.trip_id
    GROUP BY pd.programme, pd.batch_id
  ),
  maintenance_costs AS (
    SELECT
      pd.programme,
      pd.batch_id,
      COALESCE(SUM(vm.cost), 0) as maint_cost
    FROM program_deliveries pd
    LEFT JOIN vehicle_trips vt ON vt.id = pd.trip_id
    LEFT JOIN vehicle_maintenance vm ON vm.vehicle_id = vt.vehicle_id
      AND (p_start_date IS NULL OR vm.date >= p_start_date)
      AND (p_end_date IS NULL OR vm.date <= p_end_date)
    GROUP BY pd.programme, pd.batch_id
  ),
  program_costs AS (
    SELECT
      pd.programme,
      COUNT(DISTINCT pd.batch_id) as deliveries,
      SUM(pd.total_quantity) as items,
      SUM(pd.total_distance) as distance,
      SUM(COALESCE(fc.fuel_cost, 0)) as fuel,
      SUM(COALESCE(mc.maint_cost, 0)) as maint
    FROM program_deliveries pd
    LEFT JOIN fuel_costs fc ON fc.programme = pd.programme AND fc.batch_id = pd.batch_id
    LEFT JOIN maintenance_costs mc ON mc.programme = pd.programme AND mc.batch_id = pd.batch_id
    GROUP BY pd.programme
  )
  SELECT
    pc.programme::TEXT,
    pc.deliveries::BIGINT as total_deliveries,
    pc.fuel::NUMERIC as total_fuel_cost,
    pc.maint::NUMERIC as total_maintenance_cost,
    (pc.fuel + pc.maint)::NUMERIC as total_cost,
    ROUND((pc.fuel + pc.maint) / NULLIF(pc.deliveries, 0), 2) as cost_per_delivery,
    ROUND((pc.fuel + pc.maint) / NULLIF(pc.items, 0), 2) as cost_per_item,
    ROUND((pc.fuel + pc.maint)
    / NULLIF(pc.distance, 0), 2) as cost_per
km
FROM program_costs pc
ORDER BY total_cost DESC NULLS LAST;
END;
$$;

-- =============================================
-- Public Schema Wrappers
-- =============================================

CREATE OR REPLACE FUNCTION public.get_vehicle_payload_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id UUID,
  plate_number TEXT,
  vehicle_type TEXT,
  vehicle_capacity_kg DECIMAL,
  max_weight_kg INTEGER,
  total_deliveries BIGINT,
  total_items_delivered BIGINT,
  total_weight_kg NUMERIC,
  avg_payload_utilization_pct NUMERIC,
  avg_weight_utilization_pct NUMERIC,
  max_payload_utilization_pct NUMERIC,
  max_weight_utilization_pct NUMERIC,
  underutilized_deliveries BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_vehicle_payload_utilization(p_start_date, p_end_date, p_vehicle_id);
$$;

CREATE OR REPLACE FUNCTION public.get_program_performance(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_facilities_served BIGINT,
  total_items_delivered BIGINT,
  avg_items_per_delivery NUMERIC,
  on_time_deliveries BIGINT,
  on_time_rate_pct NUMERIC,
  total_distance_km NUMERIC,
  avg_distance_per_delivery_km NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_program_performance(p_start_date, p_end_date);
$$;

CREATE OR REPLACE FUNCTION public.get_driver_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  total_deliveries BIGINT,
  avg_deliveries_per_week NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC,
  avg_items_per_delivery NUMERIC,
  utilization_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_driver_utilization(p_start_date, p_end_date);
$$;

CREATE OR REPLACE FUNCTION public.get_route_efficiency(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  vehicle_plate TEXT,
  estimated_distance_km DECIMAL,
  actual_distance_km DECIMAL,
  distance_variance_pct NUMERIC,
  estimated_duration_min INTEGER,
  actual_duration_min NUMERIC,
  duration_variance_pct NUMERIC,
  efficiency_rating TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_route_efficiency(p_start_date, p_end_date);
$$;

CREATE OR REPLACE FUNCTION public.get_facility_coverage(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_programme TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_facilities BIGINT,
  facilities_served BIGINT,
  facilities_not_served BIGINT,
  coverage_pct NUMERIC,
  programme TEXT,
  program_total_facilities BIGINT,
  program_facilities_served BIGINT,
  program_coverage_pct NUMERIC,
  unserved_facility_names TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_facility_coverage(p_start_date, p_end_date, p_programme);
$$;

CREATE OR REPLACE FUNCTION public.get_cost_by_program(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_fuel_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_cost NUMERIC,
  cost_per_delivery NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_cost_by_program(p_start_date, p_end_date);
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_vehicle_payload_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_route_efficiency TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_by_program TO authenticated;

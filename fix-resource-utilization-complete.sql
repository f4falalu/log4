-- Complete Fix for Resource Utilization Functions
-- Drop and recreate all functions to fix the deleted_at column issue

-- =============================================
-- DROP EXISTING FUNCTIONS
-- =============================================

-- Drop public wrappers first
DROP FUNCTION IF EXISTS public.get_vehicle_payload_utilization(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.get_program_performance(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_driver_utilization(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_route_efficiency(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_facility_coverage(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_cost_by_program(DATE, DATE);

-- Drop analytics functions
DROP FUNCTION IF EXISTS analytics.get_vehicle_payload_utilization(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS analytics.get_program_performance(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_driver_utilization(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_route_efficiency(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_facility_coverage(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS analytics.get_cost_by_program(DATE, DATE);

-- =============================================
-- RECREATE ANALYTICS FUNCTIONS (FIXED)
-- =============================================

-- 1. Vehicle Payload Utilization
CREATE FUNCTION analytics.get_vehicle_payload_utilization(
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
      CASE
        WHEN v.capacity > 0 THEN
          ROUND((db.total_quantity::NUMERIC / v.capacity) * 100, 2)
        ELSE 0
      END as payload_util_pct,
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

-- 2. Program Performance
CREATE FUNCTION analytics.get_program_performance(
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
  late_deliveries BIGINT,
  on_time_rate_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH program_deliveries AS (
    SELECT
      db.id as batch_id,
      db.medication_type as programme,
      db.total_quantity,
      CARDINALITY(db.facility_ids) as facility_count,
      CASE
        WHEN db.actual_end_time IS NOT NULL
             AND db.scheduled_date + db.scheduled_time::TIME >= db.actual_end_time
        THEN TRUE
        ELSE FALSE
      END as was_on_time
    FROM delivery_batches db
    WHERE db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
  )
  SELECT
    pd.programme,
    COUNT(*)::BIGINT as total_deliveries,
    SUM(pd.facility_count)::BIGINT as total_facilities_served,
    SUM(pd.total_quantity)::BIGINT as total_items_delivered,
    ROUND(AVG(pd.total_quantity), 2) as avg_items_per_delivery,
    COUNT(*) FILTER (WHERE pd.was_on_time)::BIGINT as on_time_deliveries,
    COUNT(*) FILTER (WHERE NOT pd.was_on_time)::BIGINT as late_deliveries,
    ROUND((COUNT(*) FILTER (WHERE pd.was_on_time)::NUMERIC / COUNT(*)) * 100, 2) as on_time_rate_pct
  FROM program_deliveries pd
  GROUP BY pd.programme
  ORDER BY total_deliveries DESC;
END;
$$;

-- 3. Driver Utilization
CREATE FUNCTION analytics.get_driver_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  total_deliveries BIGINT,
  deliveries_per_week NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC,
  utilization_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH driver_stats AS (
    SELECT
      d.id as driver_id,
      d.name as driver_name,
      COUNT(db.id) as delivery_count,
      SUM(db.total_quantity) as items_delivered,
      SUM(db.total_distance) as distance_km,
      EXTRACT(DAYS FROM (COALESCE(p_end_date, CURRENT_DATE) - COALESCE(p_start_date, CURRENT_DATE - 30))) / 7.0 as weeks
    FROM drivers d
    LEFT JOIN delivery_batches db ON d.id = db.driver_id
      AND db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
    GROUP BY d.id, d.name
  )
  SELECT
    ds.driver_id,
    ds.driver_name,
    ds.delivery_count::BIGINT as total_deliveries,
    ROUND(CASE WHEN ds.weeks > 0 THEN ds.delivery_count / ds.weeks ELSE 0 END, 2) as deliveries_per_week,
    ds.items_delivered::BIGINT as total_items_delivered,
    ds.distance_km::NUMERIC as total_distance_km,
    CASE
      WHEN ds.delivery_count / GREATEST(ds.weeks, 1) >= 5 THEN 'High'
      WHEN ds.delivery_count / GREATEST(ds.weeks, 1) >= 3 THEN 'Medium'
      ELSE 'Low'
    END as utilization_status
  FROM driver_stats ds
  ORDER BY deliveries_per_week DESC NULLS LAST;
END;
$$;

-- 4. Route Efficiency
CREATE FUNCTION analytics.get_route_efficiency(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  route_date DATE,
  estimated_duration_min INTEGER,
  actual_duration_min INTEGER,
  estimated_distance_km NUMERIC,
  actual_distance_km NUMERIC,
  time_variance_pct NUMERIC,
  distance_variance_pct NUMERIC,
  efficiency_rating TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH route_metrics AS (
    SELECT
      db.id as batch_id,
      db.name as batch_name,
      db.scheduled_date as route_date,
      db.estimated_duration as estimated_duration_min,
      EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 60 as actual_duration_min,
      db.total_distance as estimated_distance_km,
      db.total_distance as actual_distance_km,
      CASE
        WHEN db.estimated_duration > 0 THEN
          ROUND(((EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 60 - db.estimated_duration)::NUMERIC / db.estimated_duration) * 100, 2)
        ELSE NULL
      END as time_variance_pct,
      0.0 as distance_variance_pct
    FROM delivery_batches db
    WHERE db.status = 'completed'
      AND db.actual_start_time IS NOT NULL
      AND db.actual_end_time IS NOT NULL
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
  )
  SELECT
    rm.batch_id,
    rm.batch_name,
    rm.route_date,
    rm.estimated_duration_min,
    rm.actual_duration_min::INTEGER,
    rm.estimated_distance_km,
    rm.actual_distance_km,
    rm.time_variance_pct,
    rm.distance_variance_pct,
    CASE
      WHEN ABS(rm.time_variance_pct) <= 10 THEN 'Excellent'
      WHEN ABS(rm.time_variance_pct) <= 20 THEN 'Good'
      WHEN ABS(rm.time_variance_pct) <= 30 THEN 'Fair'
      ELSE 'Poor'
    END as efficiency_rating
  FROM route_metrics rm
  ORDER BY rm.route_date DESC;
END;
$$;

-- 5. Facility Coverage
CREATE FUNCTION analytics.get_facility_coverage(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_programme TEXT DEFAULT NULL
)
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  facility_type TEXT,
  total_deliveries BIGINT,
  total_items_received BIGINT,
  last_delivery_date DATE,
  days_since_last_delivery INTEGER,
  coverage_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH facility_deliveries AS (
    SELECT
      f.id as facility_id,
      f.name as facility_name,
      f.type as facility_type,
      COUNT(db.id) as delivery_count,
      SUM(db.total_quantity) as items_received,
      MAX(db.actual_end_time::DATE) as last_delivery
    FROM facilities f
    LEFT JOIN delivery_batches db ON f.id = ANY(db.facility_ids)
      AND db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
      AND (p_programme IS NULL OR db.medication_type = p_programme)
    GROUP BY f.id, f.name, f.type
  )
  SELECT
    fd.facility_id,
    fd.facility_name,
    fd.facility_type,
    fd.delivery_count::BIGINT as total_deliveries,
    COALESCE(fd.items_received, 0)::BIGINT as total_items_received,
    fd.last_delivery as last_delivery_date,
    CASE
      WHEN fd.last_delivery IS NOT NULL THEN
        (CURRENT_DATE - fd.last_delivery)::INTEGER
      ELSE NULL
    END as days_since_last_delivery,
    CASE
      WHEN fd.last_delivery IS NULL THEN 'Never Served'
      WHEN (CURRENT_DATE - fd.last_delivery) <= 7 THEN 'Active'
      WHEN (CURRENT_DATE - fd.last_delivery) <= 30 THEN 'At Risk'
      ELSE 'Underserved'
    END as coverage_status
  FROM facility_deliveries fd
  ORDER BY days_since_last_delivery DESC NULLS LAST;
END;
$$;

-- 6. Cost by Program
CREATE FUNCTION analytics.get_cost_by_program(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_distance_km NUMERIC,
  total_items_delivered BIGINT,
  estimated_fuel_cost NUMERIC,
  cost_per_delivery NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH program_costs AS (
    SELECT
      db.medication_type as programme,
      COUNT(db.id) as delivery_count,
      SUM(db.total_distance) as total_distance,
      SUM(db.total_quantity) as total_items,
      SUM(db.total_distance) / 10.0 * 150.0 as fuel_cost
    FROM delivery_batches db
    WHERE db.status = 'completed'
      AND (p_start_date IS NULL OR db.actual_end_time::DATE >= p_start_date)
      AND (p_end_date IS NULL OR db.actual_end_time::DATE <= p_end_date)
    GROUP BY db.medication_type
  )
  SELECT
    pc.programme,
    pc.delivery_count::BIGINT as total_deliveries,
    pc.total_distance::NUMERIC as total_distance_km,
    pc.total_items::BIGINT as total_items_delivered,
    ROUND(pc.fuel_cost, 2) as estimated_fuel_cost,
    ROUND(pc.fuel_cost / pc.delivery_count, 2) as cost_per_delivery,
    ROUND(pc.fuel_cost / pc.total_items, 2) as cost_per_item,
    ROUND(pc.fuel_cost / pc.total_distance, 2) as cost_per_km
  FROM program_costs pc
  ORDER BY total_deliveries DESC;
END;
$$;

-- =============================================
-- RECREATE PUBLIC WRAPPERS
-- =============================================

CREATE FUNCTION public.get_vehicle_payload_utilization(
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

CREATE FUNCTION public.get_program_performance(
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
  late_deliveries BIGINT,
  on_time_rate_pct NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_program_performance(p_start_date, p_end_date);
$$;

CREATE FUNCTION public.get_driver_utilization(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  total_deliveries BIGINT,
  deliveries_per_week NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC,
  utilization_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_driver_utilization(p_start_date, p_end_date);
$$;

CREATE FUNCTION public.get_route_efficiency(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  route_date DATE,
  estimated_duration_min INTEGER,
  actual_duration_min INTEGER,
  estimated_distance_km NUMERIC,
  actual_distance_km NUMERIC,
  time_variance_pct NUMERIC,
  distance_variance_pct NUMERIC,
  efficiency_rating TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_route_efficiency(p_start_date, p_end_date);
$$;

CREATE FUNCTION public.get_facility_coverage(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_programme TEXT DEFAULT NULL
)
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  facility_type TEXT,
  total_deliveries BIGINT,
  total_items_received BIGINT,
  last_delivery_date DATE,
  days_since_last_delivery INTEGER,
  coverage_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM analytics.get_facility_coverage(p_start_date, p_end_date, p_programme);
$$;

CREATE FUNCTION public.get_cost_by_program(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  programme TEXT,
  total_deliveries BIGINT,
  total_distance_km NUMERIC,
  total_items_delivered BIGINT,
  estimated_fuel_cost NUMERIC,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_vehicle_payload_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_route_efficiency TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_by_program TO authenticated;

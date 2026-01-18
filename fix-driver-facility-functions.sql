-- Drop and recreate analytics functions with correct signatures

-- Drop existing functions (both analytics and public schemas)
DROP FUNCTION IF EXISTS analytics.get_driver_utilization(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_driver_utilization(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_facility_coverage(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_facility_coverage(DATE, DATE, TEXT);

-- Recreate analytics.get_driver_utilization with correct signature
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
    ROUND(CASE WHEN ds.weeks > 0 THEN ds.delivery_count / ds.weeks ELSE 0 END, 2) as avg_deliveries_per_week,
    ds.items_delivered::BIGINT as total_items_delivered,
    ds.distance_km::NUMERIC as total_distance_km,
    ROUND(CASE WHEN ds.delivery_count > 0 THEN ds.items_delivered::NUMERIC / ds.delivery_count ELSE 0 END, 2) as avg_items_per_delivery,
    CASE
      WHEN ds.delivery_count / GREATEST(ds.weeks, 1) >= 5 THEN 'High'
      WHEN ds.delivery_count / GREATEST(ds.weeks, 1) >= 3 THEN 'Medium'
      ELSE 'Low'
    END as utilization_status
  FROM driver_stats ds
  ORDER BY avg_deliveries_per_week DESC NULLS LAST;
END;
$$;

-- Recreate analytics.get_facility_coverage with correct signature
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
    WHERE (p_programme IS NULL OR programme = p_programme)
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

-- Recreate public.get_driver_utilization wrapper
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

-- Recreate public.get_facility_coverage wrapper
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_driver_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facility_coverage TO authenticated;

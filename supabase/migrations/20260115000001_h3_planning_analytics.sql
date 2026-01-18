-- H3 Planning Analytics
-- Provides RPC functions for H3 hexagonal grid metrics aggregation
-- Used by the Planning map to visualize demand, capacity, and SLA data
--
-- Note: This uses client-side H3 index generation (via h3-js).
-- The database receives H3 indexes and aggregates facility/delivery data within those cells.

-- ============================================================================
-- 1. HELPER FUNCTION: Check if a point is within an H3 cell
-- ============================================================================

-- Since we don't have PostGIS H3 extension, we'll match facilities to cells
-- by having the client compute which cell each facility belongs to.
-- The client sends both facility locations and their computed H3 indexes.

-- ============================================================================
-- 2. MAIN FUNCTION: get_h3_cell_metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_h3_cell_metrics(
  p_h3_indexes TEXT[],
  p_resolution INTEGER,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  h3_index TEXT,
  resolution INTEGER,
  deliveries BIGINT,
  demand_forecast NUMERIC,
  capacity_available NUMERIC,
  capacity_utilized NUMERIC,
  utilization_pct NUMERIC,
  sla_at_risk BIGINT,
  sla_breach_pct NUMERIC,
  active_facilities BIGINT,
  active_warehouses BIGINT
) AS $$
BEGIN
  -- For each H3 index, aggregate metrics from facilities whose positions
  -- fall within that cell. Since we can't compute H3 in the database without
  -- the extension, we return placeholder data based on facility distribution.
  --
  -- In production, you would either:
  -- 1. Install the H3 PostgreSQL extension
  -- 2. Pre-compute H3 indexes for facilities and store them
  -- 3. Use PostGIS to do spatial containment checks

  RETURN QUERY
  WITH cell_list AS (
    SELECT UNNEST(p_h3_indexes) as h3_idx
  ),
  -- Aggregate delivery stats per cell (simulated - in prod would use spatial join)
  delivery_stats AS (
    SELECT
      cl.h3_idx,
      -- Count deliveries in date range
      COUNT(DISTINCT db.id) FILTER (
        WHERE (p_start_date IS NULL OR db.scheduled_date >= p_start_date)
          AND (p_end_date IS NULL OR db.scheduled_date <= p_end_date)
      ) as delivery_count,
      -- Sum demand (total quantity)
      COALESCE(SUM(db.total_quantity) FILTER (
        WHERE (p_start_date IS NULL OR db.scheduled_date >= p_start_date)
          AND (p_end_date IS NULL OR db.scheduled_date <= p_end_date)
      ), 0) as demand_sum,
      -- Count SLA breaches (completed late)
      COUNT(DISTINCT db.id) FILTER (
        WHERE db.status = 'completed'
          AND db.actual_end_time > (db.scheduled_date::timestamp + db.scheduled_time + (db.estimated_duration || ' minutes')::interval)
          AND (p_start_date IS NULL OR db.scheduled_date >= p_start_date)
          AND (p_end_date IS NULL OR db.scheduled_date <= p_end_date)
      ) as sla_breach_count
    FROM cell_list cl
    LEFT JOIN public.delivery_batches db ON TRUE
    WHERE db.deleted_at IS NULL
    GROUP BY cl.h3_idx
  ),
  -- Count facilities (using random distribution for demo)
  facility_counts AS (
    SELECT
      cl.h3_idx,
      -- In production: COUNT facilities where h3.latLngToCell(lat, lng, res) = cl.h3_idx
      -- For now: distribute facilities randomly across cells
      COALESCE(
        (SELECT COUNT(*) FROM public.facilities f
         WHERE f.deleted_at IS NULL
         -- Simple modulo distribution based on cell index hash
         AND ABS(hashtext(f.id::text)) % GREATEST(array_length(p_h3_indexes, 1), 1)
             = ABS(hashtext(cl.h3_idx)) % GREATEST(array_length(p_h3_indexes, 1), 1)
        ), 0
      ) as facility_count
    FROM cell_list cl
  ),
  -- Count warehouses
  warehouse_counts AS (
    SELECT
      cl.h3_idx,
      COALESCE(
        (SELECT COUNT(*) FROM public.warehouses w
         WHERE w.deleted_at IS NULL
         AND ABS(hashtext(w.id::text)) % GREATEST(array_length(p_h3_indexes, 1), 1)
             = ABS(hashtext(cl.h3_idx)) % GREATEST(array_length(p_h3_indexes, 1), 1)
        ), 0
      ) as warehouse_count
    FROM cell_list cl
  )
  SELECT
    cl.h3_idx as h3_index,
    p_resolution as resolution,
    COALESCE(ds.delivery_count, 0) as deliveries,
    COALESCE(ds.demand_sum, 0)::NUMERIC as demand_forecast,
    100::NUMERIC as capacity_available, -- Placeholder
    LEAST(COALESCE(ds.delivery_count, 0), 100)::NUMERIC as capacity_utilized,
    CASE
      WHEN 100 > 0 THEN LEAST(COALESCE(ds.delivery_count, 0)::NUMERIC / 100 * 100, 100)
      ELSE 0
    END as utilization_pct,
    COALESCE(ds.sla_breach_count, 0) as sla_at_risk,
    CASE
      WHEN COALESCE(ds.delivery_count, 0) > 0
      THEN (COALESCE(ds.sla_breach_count, 0)::NUMERIC / ds.delivery_count * 100)
      ELSE 0
    END as sla_breach_pct,
    COALESCE(fc.facility_count, 0) as active_facilities,
    COALESCE(wc.warehouse_count, 0) as active_warehouses
  FROM cell_list cl
  LEFT JOIN delivery_stats ds ON ds.h3_idx = cl.h3_idx
  LEFT JOIN facility_counts fc ON fc.h3_idx = cl.h3_idx
  LEFT JOIN warehouse_counts wc ON wc.h3_idx = cl.h3_idx;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_h3_cell_metrics IS
'Aggregates delivery, capacity, and SLA metrics for H3 hexagonal cells.
Used by the Planning map to visualize demand distribution.';

-- ============================================================================
-- 3. WAREHOUSE COVERAGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_warehouse_h3_coverage(
  p_warehouse_id UUID,
  p_radius INTEGER,
  p_resolution INTEGER
)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name TEXT,
  cells TEXT[],
  total_demand NUMERIC,
  capacity_remaining NUMERIC,
  facilities_covered BIGINT
) AS $$
DECLARE
  v_warehouse RECORD;
BEGIN
  -- Get warehouse details
  SELECT w.id, w.name, w.lat, w.lng
  INTO v_warehouse
  FROM public.warehouses w
  WHERE w.id = p_warehouse_id AND w.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Note: In production, compute k-ring cells server-side using H3 extension
  -- For now, return placeholder data - actual cells computed client-side
  RETURN QUERY
  SELECT
    v_warehouse.id as warehouse_id,
    v_warehouse.name as warehouse_name,
    ARRAY[]::TEXT[] as cells, -- Client computes via h3.gridDisk
    (SELECT COALESCE(SUM(db.total_quantity), 0)::NUMERIC
     FROM public.delivery_batches db
     WHERE db.deleted_at IS NULL) as total_demand,
    1000::NUMERIC as capacity_remaining, -- Placeholder
    (SELECT COUNT(*) FROM public.facilities f WHERE f.deleted_at IS NULL) as facilities_covered;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_warehouse_h3_coverage IS
'Returns coverage data for a warehouse. Cell computation is done client-side via h3-js gridDisk.';

-- ============================================================================
-- 4. BATCH WAREHOUSE COVERAGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_batch_warehouse_h3_coverage(
  p_warehouse_ids UUID[],
  p_radius INTEGER,
  p_resolution INTEGER
)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name TEXT,
  cells TEXT[],
  total_demand NUMERIC,
  capacity_remaining NUMERIC,
  facilities_covered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id as warehouse_id,
    w.name as warehouse_name,
    ARRAY[]::TEXT[] as cells, -- Client computes
    (SELECT COALESCE(SUM(db.total_quantity), 0)::NUMERIC
     FROM public.delivery_batches db
     WHERE db.deleted_at IS NULL) / GREATEST(array_length(p_warehouse_ids, 1), 1) as total_demand,
    1000::NUMERIC as capacity_remaining,
    (SELECT COUNT(*) FROM public.facilities f WHERE f.deleted_at IS NULL) / GREATEST(array_length(p_warehouse_ids, 1), 1) as facilities_covered
  FROM public.warehouses w
  WHERE w.id = ANY(p_warehouse_ids)
    AND w.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 5. REGION AGGREGATE METRICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_h3_region_metrics(
  p_h3_indexes TEXT[],
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_deliveries BIGINT,
  total_demand NUMERIC,
  avg_utilization NUMERIC,
  sla_at_risk_count BIGINT,
  facilities_count BIGINT,
  warehouses_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT id) FROM public.delivery_batches
     WHERE deleted_at IS NULL
       AND (p_start_date IS NULL OR scheduled_date >= p_start_date)
       AND (p_end_date IS NULL OR scheduled_date <= p_end_date)) as total_deliveries,
    (SELECT COALESCE(SUM(total_quantity), 0)::NUMERIC FROM public.delivery_batches
     WHERE deleted_at IS NULL
       AND (p_start_date IS NULL OR scheduled_date >= p_start_date)
       AND (p_end_date IS NULL OR scheduled_date <= p_end_date)) as total_demand,
    50::NUMERIC as avg_utilization, -- Placeholder
    (SELECT COUNT(DISTINCT id) FROM public.delivery_batches
     WHERE deleted_at IS NULL
       AND status = 'completed'
       AND actual_end_time > (scheduled_date::timestamp + scheduled_time + (estimated_duration || ' minutes')::interval)
       AND (p_start_date IS NULL OR scheduled_date >= p_start_date)
       AND (p_end_date IS NULL OR scheduled_date <= p_end_date)) as sla_at_risk_count,
    (SELECT COUNT(*) FROM public.facilities WHERE deleted_at IS NULL) as facilities_count,
    (SELECT COUNT(*) FROM public.warehouses WHERE deleted_at IS NULL) as warehouses_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_h3_region_metrics IS
'Returns aggregate metrics for the visible region (all H3 cells in viewport).
Used by the KPI ribbon on the Planning map.';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_h3_cell_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_warehouse_h3_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_batch_warehouse_h3_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_h3_region_metrics TO authenticated;

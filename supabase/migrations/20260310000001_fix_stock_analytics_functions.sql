-- =============================================
-- Fix Stock Analytics Functions
-- =============================================
-- Problem: The original stock analytics functions (20260101000001) reference
-- facility_deliveries.product_name which does NOT exist in the table.
-- facility_deliveries only has: facility_id, batch_id, items_delivered, etc.
--
-- Fix: Rewrite functions to derive product-level delivery data by joining
-- facility_deliveries → delivery_batches (via batch_id) to get medication_type.
-- For per-facility product consumption, use delivery_batches.facility_ids array.
-- =============================================

-- =============================================
-- Function 1: Get overall stock status (FIXED)
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_stock_status()
RETURNS TABLE (
  total_products BIGINT,
  total_facilities_with_stock BIGINT,
  total_stock_items BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_low_stock_threshold INTEGER := 10; -- quantity threshold for low stock
BEGIN
  RETURN QUERY
  WITH stock_summary AS (
    SELECT
      COUNT(DISTINCT fs.product_name) as products,
      COUNT(DISTINCT fs.facility_id) as facilities,
      COALESCE(SUM(fs.quantity), 0) as items
    FROM facility_stock fs
    WHERE fs.quantity > 0
  ),
  low_stock_facilities AS (
    -- Facilities where any product is below threshold quantity
    SELECT COUNT(DISTINCT fs.facility_id) as count
    FROM facility_stock fs
    WHERE fs.quantity > 0
      AND fs.quantity < v_low_stock_threshold
  ),
  out_of_stock_facilities AS (
    -- Facilities that exist but have no stock records with quantity > 0
    SELECT COUNT(DISTINCT f.id) as count
    FROM facilities f
    WHERE NOT EXISTS (
      SELECT 1 FROM facility_stock fs
      WHERE fs.facility_id = f.id AND fs.quantity > 0
    )
  )
  SELECT
    ss.products::BIGINT,
    ss.facilities::BIGINT,
    ss.items::BIGINT,
    COALESCE(ls.count, 0)::BIGINT,
    COALESCE(oos.count, 0)::BIGINT
  FROM stock_summary ss
  CROSS JOIN low_stock_facilities ls
  CROSS JOIN out_of_stock_facilities oos;
END;
$$;

-- =============================================
-- Function 2: Get stock balance (FIXED)
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_stock_balance(
  p_product_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_name TEXT,
  total_quantity BIGINT,
  allocated_quantity BIGINT,
  available_quantity BIGINT,
  facilities_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH total_stock AS (
    SELECT
      fs.product_name,
      SUM(fs.quantity) as total_qty,
      COUNT(DISTINCT fs.facility_id) as facility_count
    FROM facility_stock fs
    WHERE fs.quantity > 0
      AND (p_product_name IS NULL OR fs.product_name = p_product_name)
    GROUP BY fs.product_name
  ),
  allocated_stock AS (
    -- Items allocated in pending/in-progress delivery batches
    SELECT
      db.medication_type as product,
      COALESCE(SUM(db.total_quantity), 0) as allocated_qty
    FROM delivery_batches db
    WHERE db.status IN ('planned', 'assigned', 'in-progress')
      AND (p_product_name IS NULL OR db.medication_type = p_product_name)
    GROUP BY db.medication_type
  )
  SELECT
    ts.product_name::TEXT,
    COALESCE(ts.total_qty, 0)::BIGINT,
    COALESCE(als.allocated_qty, 0)::BIGINT,
    GREATEST(COALESCE(ts.total_qty, 0) - COALESCE(als.allocated_qty, 0), 0)::BIGINT,
    COALESCE(ts.facility_count, 0)::BIGINT
  FROM total_stock ts
  LEFT JOIN allocated_stock als ON ts.product_name = als.product
  ORDER BY ts.product_name;
END;
$$;

-- =============================================
-- Function 3: Get stock performance metrics (FIXED)
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_stock_performance(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  product_name TEXT,
  turnover_rate NUMERIC,
  avg_days_supply NUMERIC,
  total_delivered BIGINT,
  current_stock BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_days_in_period INTEGER;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_days_in_period := GREATEST(v_end_date - v_start_date, 1);

  RETURN QUERY
  WITH delivered_items AS (
    -- Get delivery quantities per product from delivery_batches
    SELECT
      db.medication_type as prod_name,
      COALESCE(SUM(db.total_quantity), 0) as total_del
    FROM delivery_batches db
    WHERE db.scheduled_date >= v_start_date
      AND db.scheduled_date <= v_end_date
      AND db.status IN ('completed', 'in_progress')
    GROUP BY db.medication_type
  ),
  current_inventory AS (
    SELECT
      fs.product_name as prod_name,
      SUM(fs.quantity) as current_qty,
      AVG(fs.quantity) as avg_stock_level
    FROM facility_stock fs
    WHERE fs.quantity > 0
    GROUP BY fs.product_name
  )
  SELECT
    COALESCE(di.prod_name, ci.prod_name)::TEXT,
    CASE
      WHEN ci.avg_stock_level > 0 THEN
        ROUND((COALESCE(di.total_del, 0)::NUMERIC / ci.avg_stock_level), 2)
      ELSE 0
    END as turnover,
    CASE
      WHEN di.total_del > 0 AND v_days_in_period > 0 THEN
        ROUND((COALESCE(ci.current_qty, 0)::NUMERIC / (di.total_del::NUMERIC / v_days_in_period)), 1)
      ELSE NULL
    END as days_supply,
    COALESCE(di.total_del, 0)::BIGINT,
    COALESCE(ci.current_qty, 0)::BIGINT
  FROM current_inventory ci
  LEFT JOIN delivered_items di ON ci.prod_name = di.prod_name
  WHERE COALESCE(di.prod_name, ci.prod_name) IS NOT NULL
  ORDER BY turnover DESC NULLS LAST;
END;
$$;

-- =============================================
-- Function 4: Get stock by zone (FIXED)
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_stock_by_zone()
RETURNS TABLE (
  zone TEXT,
  total_products BIGINT,
  total_quantity BIGINT,
  facilities_count BIGINT,
  low_stock_facilities BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_low_stock_threshold INTEGER := 10;
BEGIN
  RETURN QUERY
  WITH zone_stock AS (
    SELECT
      f.service_zone,
      COUNT(DISTINCT fs.product_name) as products,
      COALESCE(SUM(fs.quantity), 0) as total_qty,
      COUNT(DISTINCT f.id) as facility_count
    FROM facilities f
    LEFT JOIN facility_stock fs ON f.id = fs.facility_id AND fs.quantity > 0
    WHERE f.service_zone IS NOT NULL
    GROUP BY f.service_zone
  ),
  low_stock_by_zone AS (
    SELECT
      f.service_zone,
      COUNT(DISTINCT fs.facility_id) as low_stock_count
    FROM facility_stock fs
    JOIN facilities f ON fs.facility_id = f.id
    WHERE fs.quantity > 0
      AND fs.quantity < v_low_stock_threshold
      AND f.service_zone IS NOT NULL
    GROUP BY f.service_zone
  )
  SELECT
    zs.service_zone::TEXT,
    COALESCE(zs.products, 0)::BIGINT,
    COALESCE(zs.total_qty, 0)::BIGINT,
    COALESCE(zs.facility_count, 0)::BIGINT,
    COALESCE(ls.low_stock_count, 0)::BIGINT
  FROM zone_stock zs
  LEFT JOIN low_stock_by_zone ls ON zs.service_zone = ls.service_zone
  WHERE zs.service_zone IS NOT NULL
  ORDER BY zs.service_zone;
END;
$$;

-- =============================================
-- Function 5: Get low stock alerts (FIXED)
-- =============================================
CREATE OR REPLACE FUNCTION analytics.get_low_stock_alerts(
  p_threshold_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  zone TEXT,
  product_name TEXT,
  current_quantity INTEGER,
  days_supply_remaining NUMERIC,
  last_delivery_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_quantity_threshold INTEGER := 10; -- fallback quantity threshold
BEGIN
  RETURN QUERY
  WITH facility_delivery_history AS (
    -- Get last delivery date per facility from facility_deliveries
    SELECT
      fd.facility_id,
      MAX(fd.delivery_date::DATE) as last_delivery
    FROM facility_deliveries fd
    WHERE fd.status = 'delivered'
    GROUP BY fd.facility_id
  ),
  batch_consumption AS (
    -- Estimate daily consumption per product using delivery_batches
    -- for facilities that appear in batch facility_ids arrays
    SELECT
      unnest(db.facility_ids) as fac_id,
      db.medication_type as prod_name,
      SUM(db.total_quantity)::NUMERIC / NULLIF(array_length(db.facility_ids, 1), 0) as per_facility_qty,
      COUNT(DISTINCT db.scheduled_date) as delivery_days
    FROM delivery_batches db
    WHERE db.scheduled_date >= CURRENT_DATE - INTERVAL '90 days'
      AND db.status = 'completed'
    GROUP BY unnest(db.facility_ids), db.medication_type
  ),
  daily_avg AS (
    SELECT
      bc.fac_id,
      bc.prod_name,
      CASE
        WHEN bc.delivery_days > 0 THEN bc.per_facility_qty / GREATEST(bc.delivery_days, 1)
        ELSE 0
      END as avg_daily
    FROM batch_consumption bc
  )
  SELECT
    f.id::UUID,
    f.name::TEXT,
    f.service_zone::TEXT,
    fs.product_name::TEXT,
    fs.quantity::INTEGER,
    CASE
      WHEN da.avg_daily > 0 THEN
        ROUND((fs.quantity::NUMERIC / da.avg_daily), 1)
      ELSE NULL
    END as days_remaining,
    fdh.last_delivery::DATE
  FROM facility_stock fs
  JOIN facilities f ON fs.facility_id = f.id
  LEFT JOIN daily_avg da ON fs.facility_id = da.fac_id AND fs.product_name = da.prod_name
  LEFT JOIN facility_delivery_history fdh ON fs.facility_id = fdh.facility_id
  WHERE fs.quantity > 0
    AND (
      -- Either below quantity threshold OR below days-supply threshold
      fs.quantity < v_quantity_threshold
      OR (da.avg_daily > 0 AND (fs.quantity::NUMERIC / da.avg_daily) < p_threshold_days)
    )
  ORDER BY
    CASE
      WHEN da.avg_daily > 0 THEN (fs.quantity::NUMERIC / da.avg_daily)
      ELSE fs.quantity::NUMERIC -- sort by raw quantity if no consumption data
    END ASC,
    f.name;
END;
$$;

-- =============================================
-- Recreate public schema wrappers
-- =============================================
DROP FUNCTION IF EXISTS public.get_stock_status();
DROP FUNCTION IF EXISTS public.get_stock_balance(TEXT);
DROP FUNCTION IF EXISTS public.get_stock_performance(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_stock_by_zone();
DROP FUNCTION IF EXISTS public.get_low_stock_alerts(INTEGER);

CREATE FUNCTION public.get_stock_status()
RETURNS TABLE (
  total_products BIGINT,
  total_facilities_with_stock BIGINT,
  total_stock_items BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_stock_status();
END;
$$;

CREATE FUNCTION public.get_stock_balance(
  p_product_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_name TEXT,
  total_quantity BIGINT,
  allocated_quantity BIGINT,
  available_quantity BIGINT,
  facilities_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_stock_balance(p_product_name);
END;
$$;

CREATE FUNCTION public.get_stock_performance(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  product_name TEXT,
  turnover_rate NUMERIC,
  avg_days_supply NUMERIC,
  total_delivered BIGINT,
  current_stock BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_stock_performance(p_start_date, p_end_date);
END;
$$;

CREATE FUNCTION public.get_stock_by_zone()
RETURNS TABLE (
  zone TEXT,
  total_products BIGINT,
  total_quantity BIGINT,
  facilities_count BIGINT,
  low_stock_facilities BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_stock_by_zone();
END;
$$;

CREATE FUNCTION public.get_low_stock_alerts(
  p_threshold_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  zone TEXT,
  product_name TEXT,
  current_quantity INTEGER,
  days_supply_remaining NUMERIC,
  last_delivery_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_low_stock_alerts(p_threshold_days);
END;
$$;

-- =============================================
-- Permissions
-- =============================================
GRANT EXECUTE ON FUNCTION analytics.get_stock_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_balance(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_performance(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_by_zone() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_low_stock_alerts(INTEGER) TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_stock_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_balance(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_performance(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_by_zone() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_alerts(INTEGER) TO authenticated, anon;

-- =============================================
-- Drop conflicting indexes from old migration, then recreate valid ones
-- =============================================

-- These indexes from the old migration reference non-existent columns
DROP INDEX IF EXISTS idx_facility_deliveries_product_facility;

-- Valid indexes (keep or recreate)
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_created_at
  ON facility_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_facility_stock_product_name
  ON facility_stock(product_name) WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_facility_stock_facility_product
  ON facility_stock(facility_id, product_name) WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_facilities_service_zone
  ON facilities(service_zone) WHERE service_zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_batches_status_medication
  ON delivery_batches(status, medication_type)
  WHERE status IN ('planned', 'assigned', 'in-progress');

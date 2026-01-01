-- =============================================
-- COMPLETE STOCK ANALYTICS MIGRATION
-- =============================================
-- This is a self-contained migration that:
-- 1. Creates facility_deliveries table if it doesn't exist
-- 2. Adds product_name column to facility_deliveries
-- 3. Creates all 5 stock analytics functions
-- 4. Creates public wrappers and grants permissions
-- 5. Adds performance indexes
--
-- Execute this entire file in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: Create facility_deliveries table
-- =============================================

CREATE TABLE IF NOT EXISTS public.facility_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,
  delivery_date TIMESTAMPTZ NOT NULL,
  items_delivered INTEGER NOT NULL DEFAULT 0,
  product_name TEXT, -- Added for stock analytics
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_facility_id ON public.facility_deliveries(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_batch_id ON public.facility_deliveries(batch_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_date ON public.facility_deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_product_name ON public.facility_deliveries(product_name);

COMMENT ON TABLE public.facility_deliveries IS 'Tracks historical deliveries to facilities for stock performance analytics';
COMMENT ON COLUMN public.facility_deliveries.product_name IS 'Product name delivered - used for stock performance analytics';

-- =============================================
-- STEP 2: Stock Analytics Functions
-- =============================================

-- Function 1: Get overall stock status
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
  v_low_stock_threshold INTEGER := 7; -- 7 days of supply
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
    SELECT COUNT(DISTINCT fs.facility_id) as count
    FROM facility_stock fs
    LEFT JOIN (
      -- Calculate avg daily consumption per facility/product
      SELECT
        fd.facility_id,
        fd.product_name,
        COALESCE(SUM(fd.items_delivered) / NULLIF(COUNT(DISTINCT DATE(fd.created_at)), 0), 0) as avg_daily_consumption
      FROM facility_deliveries fd
      WHERE fd.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND fd.product_name IS NOT NULL
      GROUP BY fd.facility_id, fd.product_name
    ) consumption ON fs.facility_id = consumption.facility_id
      AND fs.product_name = consumption.product_name
    WHERE fs.quantity > 0
      AND consumption.avg_daily_consumption > 0
      AND (fs.quantity / consumption.avg_daily_consumption) < v_low_stock_threshold
  ),
  out_of_stock_facilities AS (
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

COMMENT ON FUNCTION analytics.get_stock_status() IS
'Returns overall stock status including total products, facilities with stock, total items, low stock count, and out of stock count';

-- Function 2: Get stock balance (allocated vs available)
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
    SELECT
      db.medication_type as product,
      SUM(db.total_quantity) as allocated_qty
    FROM delivery_batches db
    WHERE db.status IN ('pending', 'in_progress')
      AND (p_product_name IS NULL OR db.medication_type = p_product_name)
    GROUP BY db.medication_type
  )
  SELECT
    ts.product_name::TEXT,
    COALESCE(ts.total_qty, 0)::BIGINT,
    COALESCE(als.allocated_qty, 0)::BIGINT,
    GREATEST(COALESCE(ts.total_qty, 0) - COALESCE(als.allocated_qty, 0), 0)::BIGINT as available,
    COALESCE(ts.facility_count, 0)::BIGINT
  FROM total_stock ts
  LEFT JOIN allocated_stock als ON ts.product_name = als.product
  ORDER BY ts.product_name;
END;
$$;

COMMENT ON FUNCTION analytics.get_stock_balance(TEXT) IS
'Returns stock balance showing total, allocated (in pending/in-progress deliveries), and available quantities per product';

-- Function 3: Get stock performance metrics
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
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_days_in_period := v_end_date - v_start_date;

  RETURN QUERY
  WITH delivered_items AS (
    SELECT
      fd.product_name,
      SUM(fd.items_delivered) as total_del
    FROM facility_deliveries fd
    WHERE fd.created_at >= v_start_date
      AND fd.created_at <= v_end_date
      AND fd.product_name IS NOT NULL
    GROUP BY fd.product_name
  ),
  current_inventory AS (
    SELECT
      fs.product_name,
      SUM(fs.quantity) as current_qty,
      AVG(fs.quantity) as avg_stock_level
    FROM facility_stock fs
    WHERE fs.quantity > 0
    GROUP BY fs.product_name
  ),
  daily_consumption AS (
    SELECT
      fd.product_name,
      SUM(fd.items_delivered) / NULLIF(v_days_in_period, 0) as avg_daily_consumption
    FROM facility_deliveries fd
    WHERE fd.created_at >= v_start_date
      AND fd.created_at <= v_end_date
      AND fd.product_name IS NOT NULL
    GROUP BY fd.product_name
  )
  SELECT
    COALESCE(di.product_name, ci.product_name)::TEXT,
    CASE
      WHEN ci.avg_stock_level > 0 THEN
        ROUND((COALESCE(di.total_del, 0)::NUMERIC / ci.avg_stock_level), 2)
      ELSE 0
    END as turnover,
    CASE
      WHEN dc.avg_daily_consumption > 0 THEN
        ROUND((ci.current_qty::NUMERIC / dc.avg_daily_consumption), 1)
      ELSE NULL
    END as days_supply,
    COALESCE(di.total_del, 0)::BIGINT,
    COALESCE(ci.current_qty, 0)::BIGINT
  FROM delivered_items di
  FULL OUTER JOIN current_inventory ci ON di.product_name = ci.product_name
  LEFT JOIN daily_consumption dc ON COALESCE(di.product_name, ci.product_name) = dc.product_name
  WHERE COALESCE(di.product_name, ci.product_name) IS NOT NULL
  ORDER BY turnover DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION analytics.get_stock_performance(DATE, DATE) IS
'Returns stock performance metrics including turnover rate, average days of supply, total delivered, and current stock levels';

-- Function 4: Get stock by zone
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
  v_low_stock_threshold INTEGER := 7; -- 7 days of supply
BEGIN
  RETURN QUERY
  WITH zone_stock AS (
    SELECT
      f.service_zone,
      COUNT(DISTINCT fs.product_name) as products,
      SUM(fs.quantity) as total_qty,
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
    LEFT JOIN (
      SELECT
        fd.facility_id,
        fd.product_name,
        SUM(fd.items_delivered) / NULLIF(COUNT(DISTINCT DATE(fd.created_at)), 0) as avg_daily_consumption
      FROM facility_deliveries fd
      WHERE fd.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND fd.product_name IS NOT NULL
      GROUP BY fd.facility_id, fd.product_name
    ) consumption ON fs.facility_id = consumption.facility_id
      AND fs.product_name = consumption.product_name
    WHERE fs.quantity > 0
      AND consumption.avg_daily_consumption > 0
      AND (fs.quantity / consumption.avg_daily_consumption) < v_low_stock_threshold
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

COMMENT ON FUNCTION analytics.get_stock_by_zone() IS
'Returns stock distribution by service zone including total products, quantities, facilities count, and low stock facilities';

-- Function 5: Get low stock alerts
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
BEGIN
  RETURN QUERY
  WITH daily_consumption AS (
    SELECT
      fd.facility_id,
      fd.product_name,
      SUM(fd.items_delivered) / NULLIF(COUNT(DISTINCT DATE(fd.created_at)), 0) as avg_daily_consumption,
      MAX(DATE(fd.created_at)) as last_delivery
    FROM facility_deliveries fd
    WHERE fd.created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND fd.product_name IS NOT NULL
    GROUP BY fd.facility_id, fd.product_name
  )
  SELECT
    f.id::UUID,
    f.name::TEXT,
    f.service_zone::TEXT,
    fs.product_name::TEXT,
    fs.quantity::INTEGER,
    CASE
      WHEN dc.avg_daily_consumption > 0 THEN
        ROUND((fs.quantity::NUMERIC / dc.avg_daily_consumption), 1)
      ELSE NULL
    END as days_remaining,
    dc.last_delivery::DATE
  FROM facility_stock fs
  JOIN facilities f ON fs.facility_id = f.id
  LEFT JOIN daily_consumption dc ON fs.facility_id = dc.facility_id
    AND fs.product_name = dc.product_name
  WHERE fs.quantity > 0
    AND dc.avg_daily_consumption > 0
    AND (fs.quantity / dc.avg_daily_consumption) < p_threshold_days
  ORDER BY
    CASE
      WHEN dc.avg_daily_consumption > 0 THEN (fs.quantity::NUMERIC / dc.avg_daily_consumption)
      ELSE 999999
    END ASC,
    f.name;
END;
$$;

COMMENT ON FUNCTION analytics.get_low_stock_alerts(INTEGER) IS
'Returns facilities with stock levels below the specified threshold (in days of supply)';

-- =============================================
-- STEP 3: Public Schema Wrappers
-- =============================================

-- Drop existing wrappers if they exist
DROP FUNCTION IF EXISTS public.get_stock_status();
DROP FUNCTION IF EXISTS public.get_stock_balance(TEXT);
DROP FUNCTION IF EXISTS public.get_stock_performance(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_stock_by_zone();
DROP FUNCTION IF EXISTS public.get_low_stock_alerts(INTEGER);

-- Wrapper 1: get_stock_status
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

-- Wrapper 2: get_stock_balance
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

-- Wrapper 3: get_stock_performance
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

-- Wrapper 4: get_stock_by_zone
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

-- Wrapper 5: get_low_stock_alerts
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
-- STEP 4: Permissions
-- =============================================

-- Grant execute permissions on analytics schema functions
GRANT EXECUTE ON FUNCTION analytics.get_stock_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_balance(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_performance(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_stock_by_zone() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_low_stock_alerts(INTEGER) TO authenticated, anon;

-- Grant execute permissions on public schema wrappers
GRANT EXECUTE ON FUNCTION public.get_stock_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_balance(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_performance(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_by_zone() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_alerts(INTEGER) TO authenticated, anon;

-- =============================================
-- STEP 5: Performance Indexes
-- =============================================

-- Index on facility_deliveries for consumption calculations
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_created_at
  ON facility_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_facility_deliveries_product_facility
  ON facility_deliveries(facility_id, product_name, created_at);

-- Index on facility_stock for product lookups
CREATE INDEX IF NOT EXISTS idx_facility_stock_product_name
  ON facility_stock(product_name) WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_facility_stock_facility_product
  ON facility_stock(facility_id, product_name) WHERE quantity > 0;

-- Index on facilities for zone aggregation
CREATE INDEX IF NOT EXISTS idx_facilities_service_zone
  ON facilities(service_zone) WHERE service_zone IS NOT NULL;

-- Index on delivery_batches for allocated stock calculation
CREATE INDEX IF NOT EXISTS idx_delivery_batches_status_medication
  ON delivery_batches(status, medication_type)
  WHERE status IN ('pending', 'in_progress');

-- =============================================
-- Migration Complete
-- =============================================

COMMENT ON SCHEMA analytics IS 'Analytics schema containing stock performance and reporting functions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Stock Analytics Migration Complete!';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - facility_deliveries table';
  RAISE NOTICE '  - 5 analytics functions (get_stock_status, get_stock_balance, get_stock_performance, get_stock_by_zone, get_low_stock_alerts)';
  RAISE NOTICE '  - 5 public wrappers';
  RAISE NOTICE '  - 8 performance indexes';
  RAISE NOTICE 'Next: Test functions with SELECT * FROM get_stock_status();';
END $$;

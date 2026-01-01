-- =============================================
-- STOCK ANALYTICS - SIMPLIFIED VERSION
-- =============================================
-- This version works without service_zone column
-- and creates minimal stock analytics functions
-- =============================================

-- =============================================
-- STEP 1: Create tables
-- =============================================

CREATE TABLE IF NOT EXISTS public.facility_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_facility_stock_facility_id ON public.facility_stock(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_product_name ON public.facility_stock(product_name) WHERE quantity > 0;

CREATE TABLE IF NOT EXISTS public.facility_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  batch_id UUID,
  delivery_date TIMESTAMPTZ NOT NULL,
  items_delivered INTEGER NOT NULL DEFAULT 0,
  product_name TEXT,
  driver_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_deliveries_facility_id ON public.facility_deliveries(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_created_at ON public.facility_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_product_name ON public.facility_deliveries(product_name) WHERE product_name IS NOT NULL;

-- =============================================
-- STEP 2: Analytics Functions (Simplified)
-- =============================================

CREATE OR REPLACE FUNCTION analytics.get_stock_status()
RETURNS TABLE (
  total_products BIGINT,
  total_facilities_with_stock BIGINT,
  total_stock_items BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT product_name)::BIGINT,
    COUNT(DISTINCT facility_id)::BIGINT,
    COALESCE(SUM(quantity), 0)::BIGINT,
    0::BIGINT as low_stock,
    (SELECT COUNT(*)::BIGINT FROM facilities WHERE id NOT IN (SELECT DISTINCT facility_id FROM facility_stock WHERE quantity > 0))
  FROM facility_stock
  WHERE quantity > 0;
END;
$$;

CREATE OR REPLACE FUNCTION analytics.get_stock_balance(p_product_name TEXT DEFAULT NULL)
RETURNS TABLE (
  product_name TEXT,
  total_quantity BIGINT,
  allocated_quantity BIGINT,
  available_quantity BIGINT,
  facilities_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.product_name::TEXT,
    COALESCE(SUM(fs.quantity), 0)::BIGINT,
    0::BIGINT as allocated,
    COALESCE(SUM(fs.quantity), 0)::BIGINT as available,
    COUNT(DISTINCT fs.facility_id)::BIGINT
  FROM facility_stock fs
  WHERE fs.quantity > 0
    AND (p_product_name IS NULL OR fs.product_name = p_product_name)
  GROUP BY fs.product_name
  ORDER BY fs.product_name;
END;
$$;

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
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.product_name::TEXT,
    0::NUMERIC as turnover,
    NULL::NUMERIC as days_supply,
    0::BIGINT as delivered,
    COALESCE(SUM(fs.quantity), 0)::BIGINT
  FROM facility_stock fs
  WHERE fs.quantity > 0
  GROUP BY fs.product_name
  ORDER BY fs.product_name;
END;
$$;

CREATE OR REPLACE FUNCTION analytics.get_stock_by_zone()
RETURNS TABLE (
  zone TEXT,
  total_products BIGINT,
  total_quantity BIGINT,
  facilities_count BIGINT,
  low_stock_facilities BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'All Facilities'::TEXT,
    COUNT(DISTINCT product_name)::BIGINT,
    COALESCE(SUM(quantity), 0)::BIGINT,
    COUNT(DISTINCT facility_id)::BIGINT,
    0::BIGINT
  FROM facility_stock
  WHERE quantity > 0;
END;
$$;

CREATE OR REPLACE FUNCTION analytics.get_low_stock_alerts(p_threshold_days INTEGER DEFAULT 7)
RETURNS TABLE (
  facility_id UUID,
  facility_name TEXT,
  zone TEXT,
  product_name TEXT,
  current_quantity INTEGER,
  days_supply_remaining NUMERIC,
  last_delivery_date DATE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.facility_id::UUID,
    f.name::TEXT,
    'N/A'::TEXT as zone,
    fs.product_name::TEXT,
    fs.quantity::INTEGER,
    NULL::NUMERIC,
    NULL::DATE
  FROM facility_stock fs
  JOIN facilities f ON fs.facility_id = f.id
  WHERE fs.quantity > 0 AND fs.quantity < 10
  ORDER BY fs.quantity ASC
  LIMIT 20;
END;
$$;

-- =============================================
-- STEP 3: Public Wrappers
-- =============================================

DROP FUNCTION IF EXISTS public.get_stock_status();
DROP FUNCTION IF EXISTS public.get_stock_balance(TEXT);
DROP FUNCTION IF EXISTS public.get_stock_performance(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_stock_by_zone();
DROP FUNCTION IF EXISTS public.get_low_stock_alerts(INTEGER);

CREATE FUNCTION public.get_stock_status()
RETURNS TABLE (total_products BIGINT, total_facilities_with_stock BIGINT, total_stock_items BIGINT, low_stock_count BIGINT, out_of_stock_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT * FROM analytics.get_stock_status(); END; $$;

CREATE FUNCTION public.get_stock_balance(p_product_name TEXT DEFAULT NULL)
RETURNS TABLE (product_name TEXT, total_quantity BIGINT, allocated_quantity BIGINT, available_quantity BIGINT, facilities_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT * FROM analytics.get_stock_balance(p_product_name); END; $$;

CREATE FUNCTION public.get_stock_performance(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (product_name TEXT, turnover_rate NUMERIC, avg_days_supply NUMERIC, total_delivered BIGINT, current_stock BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT * FROM analytics.get_stock_performance(p_start_date, p_end_date); END; $$;

CREATE FUNCTION public.get_stock_by_zone()
RETURNS TABLE (zone TEXT, total_products BIGINT, total_quantity BIGINT, facilities_count BIGINT, low_stock_facilities BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT * FROM analytics.get_stock_by_zone(); END; $$;

CREATE FUNCTION public.get_low_stock_alerts(p_threshold_days INTEGER DEFAULT 7)
RETURNS TABLE (facility_id UUID, facility_name TEXT, zone TEXT, product_name TEXT, current_quantity INTEGER, days_supply_remaining NUMERIC, last_delivery_date DATE)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY SELECT * FROM analytics.get_low_stock_alerts(p_threshold_days); END; $$;

-- =============================================
-- STEP 4: Permissions
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

-- Success
DO $$ BEGIN
  RAISE NOTICE '✅ Stock Analytics (Simplified) Migration Complete!';
  RAISE NOTICE 'Tables: facility_stock, facility_deliveries';
  RAISE NOTICE 'Functions: 5 analytics + 5 wrappers';
  RAISE NOTICE 'Test: SELECT * FROM get_stock_status();';
END $$;

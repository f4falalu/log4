-- Drop hardcoded lgas table and update all references to use admin_units
-- This migration:
-- 1. Updates zone_metrics view to use admin_units (admin_level=6)
-- 2. Updates zone_facility_hierarchy view
-- 3. Updates get_zone_summary function
-- 4. Drops the old lgas table

BEGIN;

-- =====================================================
-- 1. Update zone_metrics view to use admin_units
-- =====================================================

DROP VIEW IF EXISTS public.zone_metrics;

CREATE OR REPLACE VIEW public.zone_metrics AS
SELECT
  z.id as zone_id,
  z.name as zone_name,
  z.code as zone_code,
  z.is_active,
  0 as warehouse_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.admin_level = 6) as lga_count,
  COUNT(DISTINCT f.id) as facility_count,
  0 as fleet_count,
  z.created_at,
  z.updated_at
FROM public.zones z
LEFT JOIN public.admin_units l ON l.zone_id = z.id AND l.admin_level = 6
LEFT JOIN public.facilities f ON f.zone_id = z.id
GROUP BY z.id, z.name, z.code, z.is_active, z.created_at, z.updated_at;

COMMENT ON VIEW public.zone_metrics IS 'Aggregated metrics for each zone including counts of LGAs (from admin_units) and facilities';

-- =====================================================
-- 2. Update zone_facility_hierarchy view to use admin_units
-- =====================================================

DROP VIEW IF EXISTS public.zone_facility_hierarchy;

CREATE OR REPLACE VIEW public.zone_facility_hierarchy AS
SELECT
  z.id as zone_id,
  z.name as zone_name,
  z.code as zone_code,
  NULL::uuid as warehouse_id,
  NULL::text as warehouse_name,
  l.id as lga_id,
  l.name as lga_name,
  f.id as facility_id,
  f.name as facility_name,
  f.type as facility_type,
  f.lat as facility_lat,
  f.lng as facility_lng
FROM public.zones z
LEFT JOIN public.admin_units l ON l.zone_id = z.id AND l.admin_level = 6
LEFT JOIN public.facilities f ON f.zone_id = z.id
WHERE z.is_active = true;

COMMENT ON VIEW public.zone_facility_hierarchy IS 'Complete hierarchical view of zones → LGAs (admin_units) → facilities';

-- =====================================================
-- 3. Update get_zone_summary function to use admin_units
-- =====================================================

DROP FUNCTION IF EXISTS public.get_zone_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_zone_summary(zone_uuid UUID)
RETURNS TABLE (
  zone_name TEXT,
  warehouse_count BIGINT,
  lga_count BIGINT,
  facility_count BIGINT,
  fleet_count BIGINT,
  active_dispatches BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    z.name,
    0::bigint as warehouse_count,
    COUNT(DISTINCT l.id) FILTER (WHERE l.admin_level = 6) as lga_count,
    COUNT(DISTINCT f.id) as facility_count,
    0::bigint as fleet_count,
    0::bigint as active_dispatches
  FROM public.zones z
  LEFT JOIN public.admin_units l ON l.zone_id = z.id AND l.admin_level = 6
  LEFT JOIN public.facilities f ON f.zone_id = z.id
  WHERE z.id = zone_uuid
  GROUP BY z.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Drop the old lgas table
-- =====================================================

-- First, remove from realtime publication (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'lgas'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.lgas;
  END IF;
END $$;

-- Drop the table
DROP TABLE IF EXISTS public.lgas CASCADE;

COMMIT;

-- Comment
COMMENT ON SCHEMA public IS 'BIKO Zones using admin_units for LGAs (admin_level=6) - old lgas table removed';

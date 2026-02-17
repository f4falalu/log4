-- =====================================================
-- Migration: Fix Sample Zones and Service Areas Data
-- Description: Adds sample zones and service areas to enable route management
-- =====================================================

-- Disable foreign key constraints temporarily
SET session_replication_role = replica;

-- =====================================================
-- 1. INSERT SAMPLE ZONES
-- =====================================================

INSERT INTO public.zones (id, name, code, region_center, description, is_active)
VALUES
  (gen_random_uuid(), 'Kano Zone', 'KANO', '{"lat": 12.0022, "lng": 8.5919}', 'Kano and surrounding areas', true),
  (gen_random_uuid(), 'Lagos Zone', 'LAG', '{"lat": 6.5244, "lng": 3.3792}', 'Lagos and surrounding areas', true),
  (gen_random_uuid(), 'Abuja Zone', 'ABJ', '{"lat": 9.0579, "lng": 7.4951}', 'Abuja and surrounding areas', true);

-- =====================================================
-- 2. INSERT SAMPLE SERVICE AREAS
-- =====================================================

INSERT INTO public.service_areas (id, name, zone_id, warehouse_id, service_type, description, max_distance_km, delivery_frequency, priority, is_active)
SELECT 
  gen_random_uuid() as id,
  'Kano Central Service Area' as name,
  z.id as zone_id,
  '33333333-3333-3333-3333-333333333333' as warehouse_id,
  'general' as service_type,
  'Central Kano facilities' as description,
  25.0 as max_distance_km,
  'weekly' as delivery_frequency,
  'standard' as priority,
  true as is_active
FROM public.zones z WHERE z.code = 'KANO' LIMIT 1

UNION ALL

SELECT 
  gen_random_uuid() as id,
  'Kano Rural Service Area' as name,
  z.id as zone_id,
  '33333333-3333-3333-3333-333333333333' as warehouse_id,
  'general' as service_type,
  'Rural Kano facilities' as description,
  50.0 as max_distance_km,
  'biweekly' as delivery_frequency,
  'standard' as priority,
  true as is_active
FROM public.zones z WHERE z.code = 'KANO' LIMIT 1

UNION ALL

SELECT 
  gen_random_uuid() as id,
  'Lagos Mainland Service Area' as name,
  z.id as zone_id,
  '11111111-1111-1111-1111-111111111111' as warehouse_id,
  'general' as service_type,
  'Lagos mainland facilities' as description,
  30.0 as max_distance_km,
  'weekly' as delivery_frequency,
  'high' as priority,
  true as is_active
FROM public.zones z WHERE z.code = 'LAG' LIMIT 1

UNION ALL

SELECT 
  gen_random_uuid() as id,
  'Abuja Central Service Area' as name,
  z.id as zone_id,
  '22222222-2222-2222-2222-222222222222' as warehouse_id,
  'general' as service_type,
  'Central Abuja facilities' as description,
  25.0 as max_distance_km,
  'weekly' as delivery_frequency,
  'high' as priority,
  true as is_active
FROM public.zones z WHERE z.code = 'ABJ' LIMIT 1;

-- =====================================================
-- 3. ASSIGN FACILITIES TO SERVICE AREAS
-- =====================================================

INSERT INTO public.service_area_facilities (service_area_id, facility_id)
SELECT 
  sa.id as service_area_id,
  f.id as facility_id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Kano Central Service Area'
AND f.id IN ('f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555')

UNION ALL

SELECT 
  sa.id as service_area_id,
  f.id as facility_id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Kano Rural Service Area'
AND f.id = 'f2222222-2222-2222-2222-222222222222'

UNION ALL

SELECT 
  sa.id as service_area_id,
  f.id as facility_id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Lagos Mainland Service Area'
AND f.id = 'f3333333-3333-3333-3333-333333333333'

UNION ALL

SELECT 
  sa.id as service_area_id,
  f.id as facility_id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Abuja Central Service Area'
AND f.id = 'f4444444-4444-4444-4444-444444444444';

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

RAISE NOTICE '=============================================================';
RAISE NOTICE 'Sample Zones and Service Areas created successfully!';
RAISE NOTICE '=============================================================';
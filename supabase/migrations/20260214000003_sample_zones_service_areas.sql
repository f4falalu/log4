-- =====================================================
-- Migration: Sample Zones and Service Areas Seed Data
-- Description: Adds sample zones and service areas to enable route management
-- =====================================================

-- =====================================================
-- 1. INSERT SAMPLE ZONES (without user references for now)
-- =====================================================

INSERT INTO public.zones (id, name, code, region_center, description, is_active)
VALUES
  (gen_random_uuid(), 'Kano Zone', 'KANO', '{"lat": 12.0022, "lng": 8.5919}', 'Kano and surrounding areas', true),
  (gen_random_uuid(), 'Lagos Zone', 'LAG', '{"lat": 6.5244, "lng": 3.3792}', 'Lagos and surrounding areas', true),
  (gen_random_uuid(), 'Abuja Zone', 'ABJ', '{"lat": 9.0579, "lng": 7.4951}', 'Abuja and surrounding areas', true);

-- =====================================================
-- 2. INSERT SAMPLE SERVICE AREAS (using multiple inserts)
-- =====================================================

-- Kano Central Service Area
INSERT INTO public.service_areas (id, name, zone_id, warehouse_id, service_type, description, max_distance_km, delivery_frequency, priority, is_active)
SELECT
  gen_random_uuid(),
  'Kano Central Service Area',
  z.id,
  '33333333-3333-3333-3333-333333333333',
  'general',
  'Central Kano facilities',
  25.0,
  'weekly',
  'standard',
  true
FROM public.zones z WHERE z.code = 'KANO';

-- Kano Rural Service Area
INSERT INTO public.service_areas (id, name, zone_id, warehouse_id, service_type, description, max_distance_km, delivery_frequency, priority, is_active)
SELECT
  gen_random_uuid(),
  'Kano Rural Service Area',
  z.id,
  '33333333-3333-3333-3333-333333333333',
  'general',
  'Rural Kano facilities',
  50.0,
  'biweekly',
  'standard',
  true
FROM public.zones z WHERE z.code = 'KANO';

-- Lagos Mainland Service Area
INSERT INTO public.service_areas (id, name, zone_id, warehouse_id, service_type, description, max_distance_km, delivery_frequency, priority, is_active)
SELECT
  gen_random_uuid(),
  'Lagos Mainland Service Area',
  z.id,
  '11111111-1111-1111-1111-111111111111',
  'general',
  'Lagos mainland facilities',
  30.0,
  'weekly',
  'high',
  true
FROM public.zones z WHERE z.code = 'LAG';

-- Abuja Central Service Area
INSERT INTO public.service_areas (id, name, zone_id, warehouse_id, service_type, description, max_distance_km, delivery_frequency, priority, is_active)
SELECT
  gen_random_uuid(),
  'Abuja Central Service Area',
  z.id,
  '22222222-2222-2222-2222-222222222222',
  'general',
  'Central Abuja facilities',
  25.0,
  'weekly',
  'high',
  true
FROM public.zones z WHERE z.code = 'ABJ';

-- =====================================================
-- 3. ASSIGN FACILITIES TO SERVICE AREAS (if they exist)
-- =====================================================

-- Assign Kano facilities to Kano Central Service Area
INSERT INTO public.service_area_facilities (service_area_id, facility_id)
SELECT sa.id, f.id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Kano Central Service Area'
AND f.id IN ('f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555');

-- Assign Kano facilities to Kano Rural Service Area
INSERT INTO public.service_area_facilities (service_area_id, facility_id)
SELECT sa.id, f.id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Kano Rural Service Area'
AND f.id = 'f2222222-2222-2222-2222-222222222222';

-- Assign Lagos facilities to Lagos Mainland Service Area
INSERT INTO public.service_area_facilities (service_area_id, facility_id)
SELECT sa.id, f.id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Lagos Mainland Service Area'
AND f.id = 'f3333333-3333-3333-3333-333333333333';

-- Assign Abuja facilities to Abuja Central Service Area
INSERT INTO public.service_area_facilities (service_area_id, facility_id)
SELECT sa.id, f.id
FROM public.service_areas sa
CROSS JOIN public.facilities f
WHERE sa.name = 'Abuja Central Service Area'
AND f.id = 'f4444444-4444-4444-4444-444444444444';

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Sample Zones and Service Areas created successfully!';
  RAISE NOTICE '=============================================================';
END $$;

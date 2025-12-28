-- =====================================================
-- Development Seed Data & Admin Backdoor
-- =====================================================
-- ⚠️ WARNING: FOR DEVELOPMENT/TESTING ONLY!
-- DO NOT RUN THIS IN PRODUCTION!
-- =====================================================

-- =====================================================
-- 1. CREATE TEST ADMIN USER
-- =====================================================
-- This creates a user in auth.users table with known credentials
-- Email: admin@example.com
-- Password: Admin123!@#

-- Note: In Supabase, you typically create users through the auth API
-- This seed assumes you'll create the user through signup first,
-- then run this script to assign roles.

-- For now, we'll create a placeholder that will work once you sign up
-- The user_id will be populated after first signup

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Try to find existing admin user
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com'
  LIMIT 1;

  -- If admin user exists, assign all roles
  IF admin_user_id IS NOT NULL THEN
    -- Remove existing roles for this user to avoid conflicts
    DELETE FROM public.user_roles WHERE user_id = admin_user_id;

    -- Assign all 5 roles to admin
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES
      (admin_user_id, 'system_admin', admin_user_id),
      (admin_user_id, 'warehouse_officer', admin_user_id),
      (admin_user_id, 'driver', admin_user_id),
      (admin_user_id, 'zonal_manager', admin_user_id),
      (admin_user_id, 'viewer', admin_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (admin_user_id, 'System Administrator', '+234-800-ADMIN')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    RAISE NOTICE 'Admin user found and roles assigned: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found. Please sign up with email: admin@example.com first.';
  END IF;
END $$;

-- =====================================================
-- 2. SEED SAMPLE WAREHOUSES
-- =====================================================

INSERT INTO public.warehouses (id, name, address, lat, lng, type, capacity, operating_hours)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Zonal Warehouse - Lagos', '12 Warehouse Road, Ikeja, Lagos', 6.5244, 3.3792, 'zonal', 10000, '24/7'),
  ('22222222-2222-2222-2222-222222222222', 'Central Warehouse - Abuja', '5 Storage Avenue, Wuse, Abuja', 9.0579, 7.4951, 'central', 20000, '24/7'),
  ('33333333-3333-3333-3333-333333333333', 'Regional Warehouse - Kano', '18 Distribution Lane, Kano', 12.0022, 8.5919, 'regional', 8000, '06:00-22:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. SEED SAMPLE FACILITIES
-- =====================================================

INSERT INTO public.facilities (id, name, address, lat, lng, type, phone, contact_person, capacity, operating_hours)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'Gidan Alhazai maternity hospital', 'Gidan Alhazai hospital Gaya road, opposite Islamic hospital', 11.8333, 8.5167, 'hospital', '+234-800-GID-001', 'Dr. Amina Hassan', 200, '24/7'),
  ('f2222222-2222-2222-2222-222222222222', 'Zuga H.P', 'Zuga', 11.7500, 8.4833, 'clinic', '+234-800-ZUG-002', 'Nurse Ibrahim', 50, '08:00-16:00'),
  ('f3333333-3333-3333-3333-333333333333', 'Lagos General Hospital', '8 Harvey Road, Yaba, Lagos', 6.5074, 3.3731, 'hospital', '+234-800-LAG-003', 'Dr. Oluwaseun Adeyemi', 500, '24/7'),
  ('f4444444-4444-4444-4444-444444444444', 'Abuja Medical Center', '15 Constitution Avenue, Abuja', 9.0765, 7.3986, 'health_center', '+234-800-ABU-004', 'Dr. Fatima Mohammed', 150, '07:00-21:00'),
  ('f5555555-5555-5555-5555-555555555555', 'Kano Central Pharmacy', '22 Market Road, Kano', 12.0022, 8.5167, 'pharmacy', '+234-800-KAN-005', 'Pharmacist Yusuf', 30, '08:00-20:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. SEED SAMPLE DRIVERS
-- =====================================================

INSERT INTO public.drivers (id, name, phone, license_type, status, shift_start, shift_end, max_hours, license_verified, onboarding_completed)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Musa Ibrahim', '+234-803-DRV-001', 'commercial', 'available', '06:00', '18:00', 10, true, true),
  ('d2222222-2222-2222-2222-222222222222', 'Chinedu Okafor', '+234-805-DRV-002', 'commercial', 'available', '08:00', '20:00', 10, true, true),
  ('d3333333-3333-3333-3333-333333333333', 'Aisha Bello', '+234-807-DRV-003', 'standard', 'offline', '07:00', '19:00', 8, true, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. SEED SAMPLE VEHICLES
-- =====================================================

INSERT INTO public.vehicles (id, type, model, plate_number, capacity, max_weight, fuel_type, avg_speed, status, fuel_efficiency, capacity_volume_m3, capacity_weight_kg)
VALUES
  ('v1111111-1111-1111-1111-111111111111', 'truck', 'Isuzu NQR', 'LAG-001-AA', 5000.00, 5000, 'diesel', 45, 'available', 8.50, 15.0, 5000),
  ('v2222222-2222-2222-2222-222222222222', 'van', 'Toyota HiAce', 'ABJ-002-BB', 2000.00, 2000, 'petrol', 50, 'available', 12.00, 8.0, 2000),
  ('v3333333-3333-3333-3333-333333333333', 'pickup', 'Nissan Frontier', 'KAN-003-CC', 1000.00, 1000, 'diesel', 55, 'in-use', 10.00, 3.0, 1000)
ON CONFLICT (id) DO NOTHING;

-- Assign driver to vehicle
UPDATE public.vehicles
SET current_driver_id = 'd3333333-3333-3333-3333-333333333333'
WHERE id = 'v3333333-3333-3333-3333-333333333333';

-- =====================================================
-- 6. SEED SAMPLE VENDORS & FLEETS
-- =====================================================

-- Vendors already inserted in main migration, but ensure they exist
INSERT INTO public.vendors (id, name, contact_name, contact_phone, email, address)
VALUES
  ('vend1111-1111-1111-1111-111111111111', 'BIKO Logistics', 'John Manager', '+234-800-BIKO-001', 'fleet@biko.ng', 'Lagos, Nigeria'),
  ('vend2222-2222-2222-2222-222222222222', 'Partner Transport Co', 'Sarah Wilson', '+234-800-PART-002', 'ops@partnertransport.ng', 'Abuja, Nigeria')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fleets (id, name, vendor_id, status, mission)
VALUES
  ('fleet111-1111-1111-1111-111111111111', 'Main Fleet', 'vend1111-1111-1111-1111-111111111111', 'active', 'Primary delivery operations for Lagos and surrounding areas')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. HELPER FUNCTION: Assign Admin Role to Any User
-- =====================================================

CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  role_count INTEGER;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User with email ' || user_email || ' not found.';
  END IF;

  -- Delete existing roles to avoid conflicts
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Assign all 5 roles
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES
    (target_user_id, 'system_admin', target_user_id),
    (target_user_id, 'warehouse_officer', target_user_id),
    (target_user_id, 'driver', target_user_id),
    (target_user_id, 'zonal_manager', target_user_id),
    (target_user_id, 'viewer', target_user_id);

  GET DIAGNOSTICS role_count = ROW_COUNT;

  RETURN 'SUCCESS: Assigned ' || role_count || ' roles to user ' || user_email || ' (ID: ' || target_user_id || ')';
END;
$$;

-- =====================================================
-- 8. USAGE INSTRUCTIONS
-- =====================================================

-- To make any user an admin after they sign up, run:
-- SELECT public.make_user_admin('user@example.com');

-- To verify admin roles:
-- SELECT u.email, ur.role
-- FROM auth.users u
-- JOIN public.user_roles ur ON u.id = ur.user_id
-- WHERE u.email = 'admin@example.com';

RAISE NOTICE '=============================================================';
RAISE NOTICE 'Seed data loaded successfully!';
RAISE NOTICE '=============================================================';
RAISE NOTICE 'ADMIN BACKDOOR INSTRUCTIONS:';
RAISE NOTICE '1. Sign up with email: admin@example.com and password: Admin123!@#';
RAISE NOTICE '2. Run this seed script again to assign admin roles';
RAISE NOTICE '3. Or use: SELECT public.make_user_admin(''your@email.com'');';
RAISE NOTICE '=============================================================';
RAISE NOTICE 'Sample data created:';
RAISE NOTICE '- 3 Warehouses (Lagos, Abuja, Kano)';
RAISE NOTICE '- 5 Facilities (hospitals, clinics, pharmacy)';
RAISE NOTICE '- 3 Drivers';
RAISE NOTICE '- 3 Vehicles';
RAISE NOTICE '- 2 Vendors & 1 Fleet';
RAISE NOTICE '=============================================================';

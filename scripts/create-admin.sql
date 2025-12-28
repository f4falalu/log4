-- ============================================================================
-- BIKO Platform - Admin User Creation Script
-- ============================================================================
-- This script creates a super admin user with full system access
--
-- USAGE:
--   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/sql
--   2. Copy and paste this entire script
--   3. Click "Run" to execute
--   4. Login with: admin@biko.local / admin123456
--
-- IMPORTANT: Change the password after first login!
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: Create the admin user in Supabase Auth
-- ============================================================================
-- Note: Supabase handles auth.users differently - we'll create via profiles first
-- and the auth trigger will handle the rest

DO $$
DECLARE
  admin_user_id UUID := '594fe632-90cf-48ba-b83d-8f4c39d2e400';
  admin_email TEXT := 'admin@biko.local';
  admin_password TEXT := 'admin123456'; -- CHANGE THIS AFTER FIRST LOGIN
BEGIN

  -- ============================================================================
  -- STEP 2: Create profile for admin user
  -- ============================================================================
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    admin_email,
    'Super Admin',
    '+1234567890',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE 'Profile created/updated for admin user';

  -- ============================================================================
  -- STEP 3: Assign all system roles to admin
  -- ============================================================================
  -- Delete existing role assignments to start fresh
  DELETE FROM public.user_roles WHERE user_id = admin_user_id;

  -- Insert all 5 roles
  INSERT INTO public.user_roles (user_id, role, assigned_at) VALUES
    (admin_user_id, 'system_admin', NOW()),
    (admin_user_id, 'warehouse_officer', NOW()),
    (admin_user_id, 'driver', NOW()),
    (admin_user_id, 'zonal_manager', NOW()),
    (admin_user_id, 'viewer', NOW());

  RAISE NOTICE 'All 5 roles assigned to admin user';

  -- ============================================================================
  -- STEP 4: Verify the setup
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Admin User Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Password: % (CHANGE THIS!)', admin_password;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Go to Supabase Auth → Users';
  RAISE NOTICE '2. Find user with email: %', admin_email;
  RAISE NOTICE '3. If user does not exist, create manually with:';
  RAISE NOTICE '   - Email: %', admin_email;
  RAISE NOTICE '   - Password: %', admin_password;
  RAISE NOTICE '   - Click "Auto Confirm User"';
  RAISE NOTICE '4. Then run this script again to assign roles';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup worked correctly

-- Check if profile exists
SELECT
  'Profile Check' as check_type,
  id,
  email,
  full_name,
  phone,
  created_at
FROM public.profiles
WHERE email = 'admin@biko.local';

-- Check assigned roles
SELECT
  'Roles Check' as check_type,
  ur.user_id,
  p.email,
  ur.role,
  ur.assigned_at
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email = 'admin@biko.local'
ORDER BY ur.role;

-- Count total roles (should be 5)
SELECT
  'Role Count' as check_type,
  COUNT(*) as total_roles
FROM public.user_roles
WHERE user_id = '594fe632-90cf-48ba-b83d-8f4c39d2e400';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If login still fails after running this script:
--
-- 1. VERIFY AUTH USER EXISTS:
--    Go to Supabase Dashboard → Authentication → Users
--    Search for: admin@biko.local
--    If not found, manually create user with:
--    - Email: admin@biko.local
--    - Password: admin123456
--    - Auto Confirm User: YES
--
-- 2. VERIFY ROLES ASSIGNED:
--    Run the verification queries above
--    Should see 5 roles assigned
--
-- 3. VERIFY RLS POLICIES:
--    Check that RLS policies allow access for system_admin role
--
-- 4. CHECK USER UUID MATCH:
--    The auth.users.id must match profiles.id (594fe632-90cf-48ba-b83d-8f4c39d2e400)
--
-- 5. RESET PASSWORD IF NEEDED:
--    Go to Supabase Dashboard → Authentication → Users
--    Click on admin@biko.local → Reset Password
-- ============================================================================

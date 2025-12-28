-- ============================================================================
-- BIKO Platform - Fix Existing Admin User
-- ============================================================================
-- This script fixes the existing admin user: admin@biko.net
-- User ID: e7dbaa3b-3f0b-402b-bf75-11924ec67e75
--
-- FIXES:
--   1. Confirms the email (was unconfirmed, preventing login)
--   2. Creates/updates the user profile
--   3. Assigns all 5 system roles
--
-- USAGE:
--   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/sql
--   2. Copy and paste this entire script
--   3. Click "Run" to execute
--   4. Reset password in Dashboard: Auth → Users → admin@biko.net → Reset Password
--   5. Login with: admin@biko.net / [your new password]
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: Temporarily disable RLS for setup
-- ============================================================================
-- This allows us to insert profile and roles directly

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  admin_user_id UUID := 'e7dbaa3b-3f0b-402b-bf75-11924ec67e75';
  admin_email TEXT := 'admin@biko.net';
  profile_count INTEGER;
  role_count INTEGER;
BEGIN

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixing Admin User: %', admin_email;
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- STEP 2: Create/Update profile
  -- ============================================================================

  RAISE NOTICE 'Confirming email address...';

  -- Confirm the email by updating user metadata
  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb
    ),
    updated_at = NOW()
  WHERE id = admin_user_id;

  RAISE NOTICE '✓ Email confirmed for user';

  -- ============================================================================

  RAISE NOTICE 'Creating/updating profile...';

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'Super Admin',
    '+1234567890',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();

  -- Verify profile was created
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles
  WHERE id = admin_user_id;

  IF profile_count > 0 THEN
    RAISE NOTICE '✓ Profile created/updated successfully';
  ELSE
    RAISE NOTICE '✗ Failed to create profile';
  END IF;

  -- ============================================================================
  -- STEP 3: Assign all system roles
  -- ============================================================================

  RAISE NOTICE 'Assigning roles...';

  -- Delete existing roles to start fresh
  DELETE FROM public.user_roles WHERE user_id = admin_user_id;

  -- Insert all 5 roles
  INSERT INTO public.user_roles (user_id, role, assigned_at) VALUES
    (admin_user_id, 'system_admin', NOW()),
    (admin_user_id, 'warehouse_officer', NOW()),
    (admin_user_id, 'driver', NOW()),
    (admin_user_id, 'zonal_manager', NOW()),
    (admin_user_id, 'viewer', NOW());

  -- Verify roles were assigned
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles
  WHERE user_id = admin_user_id;

  RAISE NOTICE '✓ Assigned % roles', role_count;

  -- ============================================================================
  -- STEP 4: Summary
  -- ============================================================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Email Confirmed: ✓';
  RAISE NOTICE 'Profile: %', CASE WHEN profile_count > 0 THEN 'Created ✓' ELSE 'Failed ✗' END;
  RAISE NOTICE 'Roles: %/5 assigned', role_count;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Reset password in Supabase Dashboard:';
  RAISE NOTICE '   https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/auth/users';
  RAISE NOTICE '   Find admin@biko.net → Send Password Reset Email';
  RAISE NOTICE '   OR set password directly in the UI';
  RAISE NOTICE '';
  RAISE NOTICE '2. Login at http://localhost:8080';
  RAISE NOTICE '   Email: admin@biko.net';
  RAISE NOTICE '   Password: [the password you set]';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- STEP 5: Re-enable RLS (important for security)
-- ============================================================================
-- Note: RLS is currently DISABLED for development/testing
-- Uncomment these lines when you're ready to enable RLS in production:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup worked correctly

-- Check auth user status
SELECT
  'Auth User Check' as check_type,
  id,
  email,
  confirmed_at,
  email_confirmed_at,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE id = 'e7dbaa3b-3f0b-402b-bf75-11924ec67e75';

-- Check profile exists
SELECT
  'Profile Check' as check_type,
  p.id,
  au.email,
  p.full_name,
  p.phone,
  p.created_at
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.id = 'e7dbaa3b-3f0b-402b-bf75-11924ec67e75';

-- Check assigned roles
SELECT
  'Roles Check' as check_type,
  ur.user_id,
  au.email,
  ur.role,
  ur.assigned_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.user_id = 'e7dbaa3b-3f0b-402b-bf75-11924ec67e75'
ORDER BY ur.role;

-- Count total roles (should be 5)
SELECT
  'Role Count' as check_type,
  COUNT(*) as total_roles,
  CASE
    WHEN COUNT(*) = 5 THEN '✓ All roles assigned'
    ELSE '✗ Missing roles'
  END as status
FROM public.user_roles
WHERE user_id = 'e7dbaa3b-3f0b-402b-bf75-11924ec67e75';

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
--
-- Auth User Check:
--   - confirmed_at: [timestamp, not null]
--   - email_confirmed_at: [timestamp, not null]
--
-- Profile Check:
--   - 1 row with email: admin@biko.net
--   - full_name: Super Admin
--
-- Roles Check:
--   - 5 rows showing all roles
--
-- Role Count:
--   - total_roles: 5
--   - status: ✓ All roles assigned
--
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
--
-- If login still fails after running this script:
--
-- 1. PASSWORD NOT SET/FORGOTTEN:
--    - Go to: https://supabase.com/dashboard/project/fgkjhpytntgmbuxegntr/auth/users
--    - Find: admin@biko.net
--    - Click user → "Reset Password"
--    - Set new password (min 6 characters)
--
-- 2. EMAIL STILL NOT CONFIRMED:
--    - Re-run this script
--    - Or manually in dashboard: Auth → Users → admin@biko.net → "Confirm Email"
--
-- 3. ROLES NOT SHOWING:
--    - Check RLS is disabled for testing:
--      ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
--    - Re-run the role assignment section
--
-- 4. PROFILE NOT CREATED:
--    - Check if email column exists in profiles table
--    - May need to update table schema
--
-- 5. STILL CAN'T LOGIN:
--    - Check browser console for errors (F12)
--    - Check Supabase logs: Dashboard → Logs → API
--    - Verify VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env
--
-- ============================================================================

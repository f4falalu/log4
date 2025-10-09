-- ⚠️ TEST ADMIN ACCOUNT - DELETE BEFORE PRODUCTION ⚠️
-- This migration sets up a test admin account for development/testing
-- Email: admin@log4.test
-- Password: Log4Admin2025!
-- 
-- IMPORTANT: This account must be removed before production deployment

-- Create a function to setup test admin (can be called after auth signup)
CREATE OR REPLACE FUNCTION public.setup_test_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'admin@log4.test'
  LIMIT 1;

  -- If user exists, set up profile and role
  IF test_user_id IS NOT NULL THEN
    -- Insert or update profile
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (test_user_id, 'Test Admin', '+1234567890')
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Test Admin', phone = '+1234567890';

    -- Assign system_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (test_user_id, 'system_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Test admin setup complete for user %', test_user_id;
  ELSE
    RAISE NOTICE 'User admin@log4.test not found. Please sign up first.';
  END IF;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.setup_test_admin() IS '⚠️ TEST ONLY - Creates test admin account. DELETE BEFORE PRODUCTION';

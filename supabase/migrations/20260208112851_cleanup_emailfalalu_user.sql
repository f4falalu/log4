-- Clean up the malformed user record created by direct SQL INSERT.
-- This user was created bypassing GoTrue and causes 500 errors.
-- The Edge Function will re-create them properly via GoTrue Admin API.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the user created by our broken auto-provisioning
  -- They have minimal raw_user_meta_data (only 'email' key, no 'full_name', etc.)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'emailfalalu@gmail.com'
    AND raw_user_meta_data = jsonb_build_object('email', 'emailfalalu@gmail.com');

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found or already cleaned up';
    RETURN;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.mod4_driver_links WHERE user_id = v_user_id;
  UPDATE public.mod4_otp_codes SET status = 'expired', used_by = NULL, used_at = NULL WHERE used_by = v_user_id;
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Cleaned up malformed user: %', v_user_id;
END;
$$;

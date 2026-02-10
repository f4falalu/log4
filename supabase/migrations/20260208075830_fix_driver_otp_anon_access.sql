-- =====================================================
-- Fix verify_mod4_otp for unauthenticated driver access
-- =====================================================
-- Drivers are not logged in when they verify their OTP.
-- This migration:
--   1. Recreates verify_mod4_otp to handle anon callers
--   2. After OTP verification, sets the user's password
--      to the OTP so the client can signInWithPassword()
--   3. Inlines the mod4 driver linking (avoids auth.uid() dependency)
--   4. Grants anon execute permission

CREATE OR REPLACE FUNCTION public.verify_mod4_otp(
  p_email TEXT,
  p_otp TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_record RECORD;
  v_user_id UUID;
BEGIN
  -- Find matching pending OTP
  SELECT * INTO v_otp_record
  FROM public.mod4_otp_codes
  WHERE target_email = p_email
    AND status = 'pending'
    AND expires_at > NOW()
    AND attempts < max_attempts
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Increment attempts
  UPDATE public.mod4_otp_codes
  SET attempts = attempts + 1
  WHERE id = v_otp_record.id;

  -- Check OTP
  IF v_otp_record.otp_code != p_otp THEN
    RETURN FALSE;
  END IF;

  -- Find user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark OTP as used (use target user ID since caller may be anon)
  UPDATE public.mod4_otp_codes
  SET status = 'used', used_at = NOW(), used_by = v_user_id
  WHERE id = v_otp_record.id;

  -- Set user's password to the OTP so the client can call signInWithPassword
  UPDATE auth.users
  SET encrypted_password = crypt(p_otp, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Link the user to mod4 driver system (inline to avoid auth.uid() dependency)
  INSERT INTO public.mod4_driver_links (user_id, link_method, linked_by)
  VALUES (v_user_id, 'otp', v_user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    link_method = 'otp',
    linked_by = v_user_id,
    linked_at = NOW(),
    updated_at = NOW();

  -- Ensure user has driver role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'driver')
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Grant anon access so unauthenticated drivers can verify OTP
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;

-- =====================================================
-- Add phone number support to OTP verification
-- =====================================================
-- Drivers can now verify with either email or phone number.
-- Also ensures pgcrypto extension is available for crypt/gen_salt.

-- Ensure pgcrypto is available (needed for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate verify_mod4_otp to accept email or phone as identifier
CREATE OR REPLACE FUNCTION public.verify_mod4_otp(
  p_email TEXT,   -- can be email or phone number
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
  v_is_phone BOOLEAN;
  v_resolved_email TEXT;
BEGIN
  -- Detect whether identifier is a phone number (starts with + or digits)
  v_is_phone := p_email ~ '^\+?\d[\d\s\-]{6,}$';

  IF v_is_phone THEN
    -- Strip non-digit chars except leading +
    DECLARE v_clean_phone TEXT;
    BEGIN
      v_clean_phone := regexp_replace(p_email, '[^\d+]', '', 'g');

      -- Look up user by phone in auth.users
      SELECT id, email INTO v_user_id, v_resolved_email
      FROM auth.users
      WHERE phone = v_clean_phone;

      IF v_user_id IS NULL THEN
        RETURN FALSE;
      END IF;

      -- Look up OTP by the resolved email
      SELECT * INTO v_otp_record
      FROM public.mod4_otp_codes
      WHERE target_email = v_resolved_email
        AND status = 'pending'
        AND expires_at > NOW()
        AND attempts < max_attempts
      ORDER BY created_at DESC
      LIMIT 1;
    END;
  ELSE
    -- Standard email lookup
    v_resolved_email := p_email;

    SELECT * INTO v_otp_record
    FROM public.mod4_otp_codes
    WHERE target_email = p_email
      AND status = 'pending'
      AND expires_at > NOW()
      AND attempts < max_attempts
    ORDER BY created_at DESC
    LIMIT 1;

    -- Find user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  END IF;

  IF NOT FOUND OR v_otp_record IS NULL THEN
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

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark OTP as used
  UPDATE public.mod4_otp_codes
  SET status = 'used', used_at = NOW(), used_by = v_user_id
  WHERE id = v_otp_record.id;

  -- Set user's password to the OTP so the client can call signInWithPassword
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_otp, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Link the user to mod4 driver system
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

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;

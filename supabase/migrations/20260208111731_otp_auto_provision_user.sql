-- =====================================================
-- Auto-provision auth.users during OTP verification
-- =====================================================
-- When a driver verifies an OTP but doesn't yet exist in auth.users,
-- create their account automatically. This closes the gap where the
-- admin generates an OTP (which only writes to mod4_otp_codes) but
-- the driver has never signed up via Supabase Auth.

DROP FUNCTION IF EXISTS public.verify_mod4_otp(TEXT, TEXT);

CREATE FUNCTION public.verify_mod4_otp(
  p_email TEXT,   -- can be email or phone number
  p_otp TEXT
)
RETURNS TEXT      -- returns resolved email on success, NULL on failure
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
    DECLARE v_clean_phone TEXT;
    BEGIN
      v_clean_phone := regexp_replace(p_email, '[^\d+]', '', 'g');

      -- Look up user by phone in auth.users
      SELECT id, email INTO v_user_id, v_resolved_email
      FROM auth.users
      WHERE phone = v_clean_phone;

      IF v_user_id IS NULL THEN
        RETURN NULL;
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

    -- Find pending OTP first (before user lookup)
    SELECT * INTO v_otp_record
    FROM public.mod4_otp_codes
    WHERE target_email = p_email
      AND status = 'pending'
      AND expires_at > NOW()
      AND attempts < max_attempts
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_otp_record IS NULL THEN
      RETURN NULL;
    END IF;

    -- Increment attempts early
    UPDATE public.mod4_otp_codes
    SET attempts = attempts + 1
    WHERE id = v_otp_record.id;

    -- Check OTP before doing any user provisioning
    IF v_otp_record.otp_code != p_otp THEN
      RETURN NULL;
    END IF;

    -- Find user by email — auto-provision if they don't exist
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

    IF v_user_id IS NULL THEN
      -- Auto-create the user in auth.users
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        p_email,
        extensions.crypt(p_otp, extensions.gen_salt('bf', 10)),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('email', p_email),
        NOW(),
        NOW(),
        '',
        ''
      );

      -- Also create identity record (required by Supabase Auth)
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        'email',
        jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
        NOW(),
        NOW(),
        NOW()
      );
    ELSE
      -- User exists, just update their password
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(p_otp, extensions.gen_salt('bf', 10)),
          updated_at = NOW()
      WHERE id = v_user_id;
    END IF;

    -- Mark OTP as used
    UPDATE public.mod4_otp_codes
    SET status = 'used', used_at = NOW(), used_by = v_user_id
    WHERE id = v_otp_record.id;

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

    RETURN v_resolved_email;
  END IF;

  -- Phone path: continue with OTP check (user already found above)
  IF v_otp_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Increment attempts
  UPDATE public.mod4_otp_codes
  SET attempts = attempts + 1
  WHERE id = v_otp_record.id;

  -- Check OTP
  IF v_otp_record.otp_code != p_otp THEN
    RETURN NULL;
  END IF;

  -- Mark OTP as used
  UPDATE public.mod4_otp_codes
  SET status = 'used', used_at = NOW(), used_by = v_user_id
  WHERE id = v_otp_record.id;

  -- Set user's password to the OTP
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_otp, extensions.gen_salt('bf', 10)),
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

  RETURN v_resolved_email;
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;

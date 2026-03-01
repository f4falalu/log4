-- ============================================================================
-- Fix verify_mod4_otp and link_user_to_mod4: use role_id for user_roles insert
-- ============================================================================
-- Issue: These RPCs insert into user_roles with only (user_id, role) but
-- migration 20260221170001 made role_id NOT NULL (FK to roles table).
-- This causes: "null value in column role_id violates not-null constraint"
-- when drivers try to activate via OTP.
-- ============================================================================

-- =========================
-- 1. Fix verify_mod4_otp
-- =========================
CREATE OR REPLACE FUNCTION public.verify_mod4_otp(
  p_email TEXT,
  p_otp TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_record RECORD;
  v_user_id UUID;
  v_is_phone BOOLEAN;
  v_resolved_email TEXT;
  v_driver_role_id UUID;
BEGIN
  -- Look up the driver role ID upfront
  SELECT id INTO v_driver_role_id
  FROM roles
  WHERE code = 'driver' AND is_system_role = TRUE
  LIMIT 1;

  IF v_driver_role_id IS NULL THEN
    RAISE EXCEPTION 'Driver role not found in roles table';
  END IF;

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

    -- Ensure user has driver role (with role_id)
    INSERT INTO public.user_roles (user_id, role, role_id)
    VALUES (v_user_id, 'driver', v_driver_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

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

  -- Ensure user has driver role (with role_id)
  INSERT INTO public.user_roles (user_id, role, role_id)
  VALUES (v_user_id, 'driver', v_driver_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN v_resolved_email;
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;


-- =========================
-- 2. Fix link_user_to_mod4
-- =========================
CREATE OR REPLACE FUNCTION public.link_user_to_mod4(
  p_user_id UUID,
  p_link_method TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
  v_admin_id UUID := auth.uid();
  v_driver_role_id UUID;
BEGIN
  -- Look up the driver role ID
  SELECT id INTO v_driver_role_id
  FROM roles
  WHERE code = 'driver' AND is_system_role = TRUE
  LIMIT 1;

  IF v_driver_role_id IS NULL THEN
    RAISE EXCEPTION 'Driver role not found in roles table';
  END IF;

  -- Insert the link
  INSERT INTO public.mod4_driver_links (user_id, link_method, linked_by)
  VALUES (p_user_id, p_link_method, v_admin_id)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    link_method = p_link_method,
    linked_by = v_admin_id,
    linked_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_link_id;

  -- Ensure user has driver role (with role_id)
  INSERT INTO public.user_roles (user_id, role, role_id)
  VALUES (p_user_id, 'driver', v_driver_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN v_link_id;
END;
$$;

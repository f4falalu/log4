-- ============================================================================
-- Auto-create drivers record when drivers onboard via MOD4 OTP
-- ============================================================================
-- Issue: verify_mod4_otp creates auth.users, mod4_driver_links, user_roles,
-- and workspace_members — but never creates a record in the `drivers` table.
-- FleetOps/Drivers queries the `drivers` table directly, so MOD4-onboarded
-- drivers are invisible in FleetOps.
--
-- Fix: After OTP verification, INSERT into `drivers` and set
-- `mod4_driver_links.driver_id` to complete the bridge.
-- Also update `complete_driver_activation` to sync display_name → drivers.name.
-- ============================================================================

-- =========================
-- 1. Updated verify_mod4_otp
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
  v_workspace_id UUID;
  v_driver_id UUID;
  v_user_phone TEXT;
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
      SELECT id, email, phone INTO v_user_id, v_resolved_email, v_user_phone
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
    SELECT id, phone INTO v_user_id, v_user_phone FROM auth.users WHERE email = p_email;

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

    -- Extract workspace_id from OTP record
    v_workspace_id := v_otp_record.workspace_id;

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

    -- Add driver to workspace so they appear in integration page
    IF v_workspace_id IS NOT NULL THEN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (v_workspace_id, v_user_id, 'member')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;

    -- *** NEW: Create a drivers table record so driver appears in FleetOps ***
    -- Only create if no driver record is already linked
    SELECT driver_id INTO v_driver_id
    FROM public.mod4_driver_links
    WHERE user_id = v_user_id AND driver_id IS NOT NULL;

    IF v_driver_id IS NULL THEN
      INSERT INTO public.drivers (
        name,
        phone,
        email,
        license_type,
        shift_start,
        shift_end,
        max_hours,
        status,
        onboarding_completed
      ) VALUES (
        COALESCE(v_resolved_email, p_email),  -- placeholder name, updated during PIN step
        COALESCE(v_user_phone, v_resolved_email),  -- phone if available, else email as placeholder
        v_resolved_email,
        'standard',
        '08:00'::TIME,
        '17:00'::TIME,
        8,
        'available',
        FALSE
      )
      RETURNING id INTO v_driver_id;

      -- Link the new driver record to mod4_driver_links
      UPDATE public.mod4_driver_links
      SET driver_id = v_driver_id, updated_at = NOW()
      WHERE user_id = v_user_id;
    END IF;

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

  -- Extract workspace_id from OTP record
  v_workspace_id := v_otp_record.workspace_id;

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

  -- Add driver to workspace so they appear in integration page
  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_user_id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  -- *** NEW: Create a drivers table record so driver appears in FleetOps ***
  -- Only create if no driver record is already linked
  SELECT driver_id INTO v_driver_id
  FROM public.mod4_driver_links
  WHERE user_id = v_user_id AND driver_id IS NOT NULL;

  IF v_driver_id IS NULL THEN
    INSERT INTO public.drivers (
      name,
      phone,
      email,
      license_type,
      shift_start,
      shift_end,
      max_hours,
      status,
      onboarding_completed
    ) VALUES (
      COALESCE(v_resolved_email, p_email),  -- placeholder name, updated during PIN step
      COALESCE(v_user_phone, v_resolved_email),  -- phone if available, else email as placeholder
      v_resolved_email,
      'standard',
      '08:00'::TIME,
      '17:00'::TIME,
      8,
      'available',
      FALSE
    )
    RETURNING id INTO v_driver_id;

    -- Link the new driver record to mod4_driver_links
    UPDATE public.mod4_driver_links
    SET driver_id = v_driver_id, updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  RETURN v_resolved_email;
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;


-- =========================
-- 2. Updated complete_driver_activation
-- =========================
-- Now syncs display_name to the drivers table and marks onboarding as complete.
CREATE OR REPLACE FUNCTION public.complete_driver_activation(
  p_pin         TEXT,
  p_device_id   TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_platform    TEXT DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_driver_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate PIN is exactly 4 digits
  IF p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  -- Set the PIN as the user's Supabase password
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      raw_user_meta_data = raw_user_meta_data ||
        CASE WHEN p_display_name IS NOT NULL
          THEN jsonb_build_object('full_name', p_display_name, 'pin_activated', true)
          ELSE jsonb_build_object('pin_activated', true)
        END,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Register (or re-register) the device
  INSERT INTO public.driver_devices (user_id, device_id, device_name, platform, user_agent)
  VALUES (v_user_id, p_device_id, p_device_name, p_platform, p_user_agent)
  ON CONFLICT (user_id, device_id) DO UPDATE SET
    is_trusted  = TRUE,
    device_name = COALESCE(EXCLUDED.device_name, driver_devices.device_name),
    platform    = COALESCE(EXCLUDED.platform, driver_devices.platform),
    user_agent  = COALESCE(EXCLUDED.user_agent, driver_devices.user_agent),
    last_seen_at = NOW(),
    revoked_at   = NULL,
    updated_at   = NOW();

  -- *** NEW: Sync display name to drivers table and mark onboarding complete ***
  SELECT driver_id INTO v_driver_id
  FROM public.mod4_driver_links
  WHERE user_id = v_user_id AND driver_id IS NOT NULL;

  IF v_driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET name = COALESCE(p_display_name, name),
        onboarding_completed = TRUE,
        updated_at = NOW()
    WHERE id = v_driver_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_driver_activation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;


-- =========================
-- 3. Updated link_user_to_mod4
-- =========================
-- Also creates a drivers record when linking manually from BIKO admin.
DROP FUNCTION IF EXISTS public.link_user_to_mod4(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.link_user_to_mod4(
  p_user_id UUID,
  p_link_method TEXT DEFAULT 'manual',
  p_workspace_id UUID DEFAULT NULL
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
  v_ws_id UUID;
  v_driver_id UUID;
  v_user_email TEXT;
  v_user_phone TEXT;
  v_user_name TEXT;
BEGIN
  -- Look up the driver role ID
  SELECT id INTO v_driver_role_id
  FROM roles
  WHERE code = 'driver' AND is_system_role = TRUE
  LIMIT 1;

  IF v_driver_role_id IS NULL THEN
    RAISE EXCEPTION 'Driver role not found in roles table';
  END IF;

  -- Fetch user info for driver record
  SELECT email, phone, raw_user_meta_data->>'full_name'
  INTO v_user_email, v_user_phone, v_user_name
  FROM auth.users
  WHERE id = p_user_id;

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

  -- Determine workspace: use explicit param, or fall back to admin's workspace
  v_ws_id := p_workspace_id;
  IF v_ws_id IS NULL AND v_admin_id IS NOT NULL THEN
    SELECT workspace_id INTO v_ws_id
    FROM public.workspace_members
    WHERE user_id = v_admin_id
    LIMIT 1;
  END IF;

  -- Add driver to workspace so they appear in integration page
  IF v_ws_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_ws_id, p_user_id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  -- *** NEW: Create a drivers table record if not already linked ***
  SELECT driver_id INTO v_driver_id
  FROM public.mod4_driver_links
  WHERE user_id = p_user_id AND driver_id IS NOT NULL;

  IF v_driver_id IS NULL THEN
    INSERT INTO public.drivers (
      name,
      phone,
      email,
      license_type,
      shift_start,
      shift_end,
      max_hours,
      status,
      onboarding_completed
    ) VALUES (
      COALESCE(v_user_name, v_user_email, 'Unknown'),
      COALESCE(v_user_phone, v_user_email, 'N/A'),
      v_user_email,
      'standard',
      '08:00'::TIME,
      '17:00'::TIME,
      8,
      'available',
      FALSE
    )
    RETURNING id INTO v_driver_id;

    UPDATE public.mod4_driver_links
    SET driver_id = v_driver_id, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_user_to_mod4(UUID, TEXT, UUID) TO authenticated;

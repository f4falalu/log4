-- =============================================================
-- Driver Onboarding & Device Binding
-- =============================================================
-- Creates:
--   1. driver_devices        – trusted device registry
--   2. onboarding_requests   – driver-submitted access requests
--   3. complete_driver_activation()  – set PIN + register device
--   4. submit_onboarding_request()   – anon rate-limited request
--   5. validate_driver_device()      – check device trust on login
--   6. get_driver_devices()          – admin view with user email
-- =============================================================

-- -------------------------------------------------------
-- 1. driver_devices
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_devices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id      TEXT        NOT NULL,
  device_name    TEXT,
  platform       TEXT,
  user_agent     TEXT,
  is_trusted     BOOLEAN     NOT NULL DEFAULT TRUE,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at     TIMESTAMPTZ,
  revoked_by     UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_devices_user_trusted
  ON public.driver_devices (user_id) WHERE is_trusted = TRUE AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_devices_device_id
  ON public.driver_devices (device_id);

ALTER TABLE public.driver_devices ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own devices
CREATE POLICY "drivers_select_own_devices" ON public.driver_devices
  FOR SELECT USING (user_id = auth.uid());

-- Drivers can insert their own devices
CREATE POLICY "drivers_insert_own_devices" ON public.driver_devices
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Drivers can update last_seen on their own devices
CREATE POLICY "drivers_update_own_devices" ON public.driver_devices
  FOR UPDATE USING (user_id = auth.uid());

-- System admins have full access
CREATE POLICY "admins_all_driver_devices" ON public.driver_devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'system_admin'
    )
  );

-- -------------------------------------------------------
-- 2. onboarding_requests
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         TEXT        NOT NULL,
  phone             TEXT,
  email             TEXT,
  organization_hint TEXT,
  device_id         TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by       UUID        REFERENCES auth.users(id),
  reviewed_at       TIMESTAMPTZ,
  reviewer_notes    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_requests_status
  ON public.onboarding_requests (status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_onboarding_requests_device_recent
  ON public.onboarding_requests (device_id, created_at DESC);

ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Anon can insert (driver submitting request)
CREATE POLICY "anon_insert_onboarding_requests" ON public.onboarding_requests
  FOR INSERT TO anon WITH CHECK (TRUE);

-- Authenticated can also insert
CREATE POLICY "auth_insert_onboarding_requests" ON public.onboarding_requests
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- System admins can read and update
CREATE POLICY "admins_select_onboarding_requests" ON public.onboarding_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'system_admin'
    )
  );

CREATE POLICY "admins_update_onboarding_requests" ON public.onboarding_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'system_admin'
    )
  );

-- -------------------------------------------------------
-- 3. complete_driver_activation
-- -------------------------------------------------------
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

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_driver_activation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;

-- -------------------------------------------------------
-- 4. submit_onboarding_request
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_onboarding_request(
  p_full_name         TEXT,
  p_phone             TEXT DEFAULT NULL,
  p_email             TEXT DEFAULT NULL,
  p_organization_hint TEXT DEFAULT NULL,
  p_device_id         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INTEGER;
  v_request_id   UUID;
BEGIN
  -- Require at least one contact method
  IF p_phone IS NULL AND p_email IS NULL THEN
    RAISE EXCEPTION 'Please provide a phone number or email address';
  END IF;

  -- Rate limit: max 3 requests per device in 24 hours
  IF p_device_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.onboarding_requests
    WHERE device_id = p_device_id
      AND created_at > NOW() - INTERVAL '24 hours';

    IF v_recent_count >= 3 THEN
      RAISE EXCEPTION 'Too many requests. Please try again later.';
    END IF;
  END IF;

  INSERT INTO public.onboarding_requests (full_name, phone, email, organization_hint, device_id)
  VALUES (p_full_name, p_phone, p_email, p_organization_hint, p_device_id)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_onboarding_request(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- -------------------------------------------------------
-- 5. validate_driver_device
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_driver_device(
  p_device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_seen and check if device is trusted
  UPDATE public.driver_devices
  SET last_seen_at = NOW()
  WHERE user_id = auth.uid()
    AND device_id = p_device_id
    AND is_trusted = TRUE
    AND revoked_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_driver_device(TEXT) TO authenticated;

-- -------------------------------------------------------
-- 6. get_driver_devices (admin view)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_driver_devices()
RETURNS TABLE (
  id            UUID,
  user_id       UUID,
  device_id     TEXT,
  device_name   TEXT,
  platform      TEXT,
  is_trusted    BOOLEAN,
  registered_at TIMESTAMPTZ,
  last_seen_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  user_email    TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    d.id,
    d.user_id,
    d.device_id,
    d.device_name,
    d.platform,
    d.is_trusted,
    d.registered_at,
    d.last_seen_at,
    d.revoked_at,
    u.email AS user_email
  FROM public.driver_devices d
  JOIN auth.users u ON u.id = d.user_id
  ORDER BY d.last_seen_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_devices() TO authenticated;

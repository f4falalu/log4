-- =====================================================
-- Mod4 Driver Integration Tables
-- =====================================================
-- Creates the linking layer between auth.users and the
-- Mod4 driver execution system, plus OTP codes for
-- driver onboarding.

-- =====================================================
-- 1. MOD4 DRIVER LINKS TABLE
-- =====================================================
-- Bridges auth.users identity to legacy drivers table
-- and tracks how the link was established.

CREATE TABLE IF NOT EXISTS public.mod4_driver_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The auth.users identity
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The legacy drivers table record (nullable)
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Link status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),

  -- Link method
  link_method TEXT NOT NULL
    CHECK (link_method IN ('email_invitation', 'otp', 'admin_direct')),

  -- Who linked and when
  linked_by UUID NOT NULL REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active link per user
  CONSTRAINT unique_user_link UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mod4_driver_links_user
  ON public.mod4_driver_links (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mod4_driver_links_driver
  ON public.mod4_driver_links (driver_id);
CREATE INDEX IF NOT EXISTS idx_mod4_driver_links_status
  ON public.mod4_driver_links (status);

-- =====================================================
-- 2. MOD4 OTP CODES TABLE
-- =====================================================
-- Short-lived OTP codes for driver onboarding.

CREATE TABLE IF NOT EXISTS public.mod4_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target
  target_email TEXT NOT NULL,

  -- The OTP (stored as plain text for admin display; short-lived)
  otp_code TEXT NOT NULL,

  -- Context
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'used', 'expired')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),

  -- Rate limiting
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_pending
  ON public.mod4_otp_codes (target_email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires
  ON public.mod4_otp_codes (expires_at) WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.mod4_driver_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mod4_otp_codes ENABLE ROW LEVEL SECURITY;

-- mod4_driver_links: users can read their own link
DO $$ BEGIN
  CREATE POLICY "Users can view own driver link"
    ON public.mod4_driver_links FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- mod4_driver_links: system admins have full access
DO $$ BEGIN
  CREATE POLICY "System admins manage driver links"
    ON public.mod4_driver_links FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'system_admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- mod4_otp_codes: system admins have full access
DO $$ BEGIN
  CREATE POLICY "System admins manage OTP codes"
    ON public.mod4_otp_codes FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'system_admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. RPC FUNCTIONS
-- =====================================================

-- Get all linked users with profile info
CREATE OR REPLACE FUNCTION public.get_mod4_linked_users()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  driver_id UUID,
  status TEXT,
  link_method TEXT,
  linked_by UUID,
  linked_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT,
  linked_by_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    l.id,
    l.user_id,
    l.driver_id,
    l.status,
    l.link_method,
    l.linked_by,
    l.linked_at,
    u.email AS user_email,
    p.full_name AS user_name,
    lp.full_name AS linked_by_name
  FROM public.mod4_driver_links l
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.profiles lp ON lp.id = l.linked_by
  ORDER BY l.linked_at DESC;
$$;

-- Link a user to Mod4
CREATE OR REPLACE FUNCTION public.link_user_to_mod4(
  p_user_id UUID,
  p_link_method TEXT DEFAULT 'admin_direct'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
  v_admin_id UUID := auth.uid();
BEGIN
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

  -- Ensure user has driver role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'driver')
  ON CONFLICT DO NOTHING;

  RETURN v_link_id;
END;
$$;

-- Generate an OTP code
CREATE OR REPLACE FUNCTION public.generate_mod4_otp(
  p_email TEXT,
  p_workspace_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Generate 6-digit code
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Expire any existing pending OTPs for this email
  UPDATE public.mod4_otp_codes
  SET status = 'expired', updated_at = NOW()
  WHERE target_email = p_email AND status = 'pending';

  -- Insert new OTP
  INSERT INTO public.mod4_otp_codes (target_email, otp_code, workspace_id, created_by)
  VALUES (p_email, v_otp, p_workspace_id, auth.uid());

  RETURN v_otp;
END;
$$;

-- Verify an OTP code
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

  -- Mark OTP as used
  UPDATE public.mod4_otp_codes
  SET status = 'used', used_at = NOW(), used_by = auth.uid()
  WHERE id = v_otp_record.id;

  -- Find user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- Link the user
    PERFORM public.link_user_to_mod4(v_user_id, 'otp');
  END IF;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 5. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_mod4_linked_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_user_to_mod4(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mod4_otp(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mod4_otp(TEXT, TEXT) TO authenticated;

-- =====================================================
-- 6. ADD updated_at COLUMN TO OTP TABLE
-- =====================================================

ALTER TABLE public.mod4_otp_codes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

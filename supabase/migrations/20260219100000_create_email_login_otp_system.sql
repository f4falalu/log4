-- Email Login OTP System
-- Custom numeric OTP codes for driver email authentication

-- =============================================
-- 1. Create email_login_otps table
-- =============================================
CREATE TABLE IF NOT EXISTS email_login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_email_login_otps_email_code ON email_login_otps(email, code) WHERE NOT used;
CREATE INDEX idx_email_login_otps_expires ON email_login_otps(expires_at) WHERE NOT used;

-- Enable RLS
ALTER TABLE email_login_otps ENABLE ROW LEVEL SECURITY;

-- RLS: No direct access (only via RPCs)
CREATE POLICY "email_login_otps_no_access" ON email_login_otps FOR ALL USING (FALSE);

-- =============================================
-- 2. RPC: Generate and store OTP
-- =============================================
CREATE OR REPLACE FUNCTION generate_email_login_otp(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_otp_id UUID;
BEGIN
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;

  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No account found with this email'
    );
  END IF;

  -- Invalidate any existing unused OTPs for this email
  UPDATE email_login_otps
  SET used = TRUE, used_at = NOW()
  WHERE email = p_email AND NOT used;

  -- Generate 6-digit code
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Set expiration (10 minutes from now)
  v_expires_at := NOW() + INTERVAL '10 minutes';

  -- Store OTP
  INSERT INTO email_login_otps (email, code, expires_at)
  VALUES (p_email, v_code, v_expires_at)
  RETURNING id INTO v_otp_id;

  -- Return success with code (for email sending)
  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'expires_at', v_expires_at,
    'otp_id', v_otp_id
  );
END;
$$;

-- =============================================
-- 3. RPC: Verify OTP and create one-time password
-- =============================================
CREATE OR REPLACE FUNCTION verify_email_login_otp(
  p_email TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_record RECORD;
  v_user_id UUID;
  v_temp_password TEXT;
BEGIN
  -- Find the OTP record
  SELECT * INTO v_otp_record
  FROM email_login_otps
  WHERE email = p_email
    AND code = p_code
    AND NOT used
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if OTP exists and is valid
  IF v_otp_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;

  -- Mark OTP as used
  UPDATE email_login_otps
  SET used = TRUE, used_at = NOW()
  WHERE id = v_otp_record.id;

  -- Get user_id
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User account not found'
    );
  END IF;

  -- Generate a one-time password (32 random chars)
  v_temp_password := encode(gen_random_bytes(24), 'base64');

  -- Update user's password to this temporary password
  -- They can sign in with this immediately after OTP verification
  UPDATE auth.users
  SET encrypted_password = crypt(v_temp_password, gen_salt('bf'))
  WHERE id = v_user_id;

  -- Return success with temp password for immediate sign-in
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'temp_password', v_temp_password
  );
END;
$$;

-- =============================================
-- 4. Cleanup function (remove expired OTPs)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_email_otps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM email_login_otps
  WHERE expires_at < NOW() - INTERVAL '1 day';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- =============================================
-- Grant permissions
-- =============================================
GRANT EXECUTE ON FUNCTION generate_email_login_otp TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_email_login_otp TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_email_otps TO service_role;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE email_login_otps IS 'Stores temporary OTP codes for email-based driver login';
COMMENT ON FUNCTION generate_email_login_otp IS 'Generates a 6-digit OTP code for email login (10min expiry)';
COMMENT ON FUNCTION verify_email_login_otp IS 'Verifies OTP code and returns user info for sign-in';
COMMENT ON FUNCTION cleanup_expired_email_otps IS 'Removes OTPs older than 1 day (run via cron)';

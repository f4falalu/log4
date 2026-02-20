-- Update OTP verification to generate temporary password for sign-in

DROP FUNCTION IF EXISTS verify_email_login_otp(TEXT, TEXT);

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

GRANT EXECUTE ON FUNCTION verify_email_login_otp TO anon, authenticated;

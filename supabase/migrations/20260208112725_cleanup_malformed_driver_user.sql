-- =====================================================
-- Clean up malformed user created by direct INSERT
-- =====================================================
-- The previous auto-provisioning migration created users via direct
-- INSERT into auth.users, bypassing GoTrue. These records cause
-- 500 errors during signInWithPassword. Delete them so they can
-- be re-created properly via the Edge Function.

-- Target: users with 'created_for' metadata (set by our auto-provision INSERT)
DO $$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Find malformed users (created by our direct INSERT, tagged with created_for)
  SELECT array_agg(id) INTO v_user_ids
  FROM auth.users
  WHERE raw_user_meta_data->>'created_for' IS NOT NULL
    AND created_at > '2026-02-08'::date;

  IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
    RAISE NOTICE 'No malformed users found — nothing to clean up';
    RETURN;
  END IF;

  -- Clean up related records
  DELETE FROM public.user_roles WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.mod4_driver_links WHERE user_id = ANY(v_user_ids);

  -- Reset OTPs used by these users
  UPDATE public.mod4_otp_codes
  SET status = 'expired', used_by = NULL, used_at = NULL
  WHERE used_by = ANY(v_user_ids);

  -- Delete auth records
  DELETE FROM auth.identities WHERE user_id = ANY(v_user_ids);
  DELETE FROM auth.users WHERE id = ANY(v_user_ids);

  RAISE NOTICE 'Cleaned up % malformed user(s)', array_length(v_user_ids, 1);
END;
$$;

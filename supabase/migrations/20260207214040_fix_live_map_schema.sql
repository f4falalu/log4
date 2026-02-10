-- =====================================================
-- Fix Live Map Schema
-- =====================================================
-- Adds missing columns and fixes functions needed for
-- /map/live, /mod4/dispatcher, and /mod4/sessions pages.
--
-- Root cause: 20260130000002_cleanup.sql dropped the original
-- driver_sessions table, and 20260130000003 recreated it with
-- a different schema (auth.users FK). This broke queries and
-- functions that expected the original mod4 schema.

-- =====================================================
-- 1. ADD STATUS COLUMN TO DRIVERS
-- =====================================================
-- Multiple queries filter drivers by status ('available', 'busy').
-- The column was never added to the drivers table.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'
  CHECK (status IN ('available', 'busy', 'offline', 'on_break'));

-- =====================================================
-- 2. EXTEND DRIVER_SESSIONS FOR GPS TRACKING
-- =====================================================
-- The current driver_sessions (from 20260130000003) is auth-focused.
-- Add columns needed for GPS tracking and dispatcher views.

ALTER TABLE public.driver_sessions
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.driver_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.driver_sessions
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE public.driver_sessions
  ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Index for vehicle lookups
CREATE INDEX IF NOT EXISTS idx_driver_sessions_vehicle
  ON public.driver_sessions (vehicle_id) WHERE vehicle_id IS NOT NULL;

-- =====================================================
-- 3. FIX get_active_drivers_with_positions()
-- =====================================================
-- The original function referenced ds.vehicle_id and ds.status = 'active'
-- which don't match the recreated driver_sessions schema.
-- Updated to work with current schema:
--   - driver_sessions.driver_id -> auth.users(id)
--   - driver_sessions.status IN ('ACTIVE', 'INVALIDATED')
--   - Join to drivers via mod4_driver_links

CREATE OR REPLACE FUNCTION get_active_drivers_with_positions()
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  session_id UUID,
  vehicle_id UUID,
  vehicle_plate TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed_mps DOUBLE PRECISION,
  last_update TIMESTAMPTZ,
  current_batch_id UUID,
  batch_name TEXT,
  session_started_at TIMESTAMPTZ,
  battery_level SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(mdl.driver_id, ds.driver_id) AS driver_id,
    COALESCE(d.name, p.full_name, 'Unknown') AS driver_name,
    ds.id AS session_id,
    ds.vehicle_id,
    v.license_plate AS vehicle_plate,
    gps.lat AS current_lat,
    gps.lng AS current_lng,
    gps.heading,
    gps.speed_mps,
    gps.captured_at AS last_update,
    gps.batch_id AS current_batch_id,
    db.name AS batch_name,
    ds.started_at AS session_started_at,
    gps.battery_level
  FROM driver_sessions ds
  -- Link to drivers via mod4_driver_links (user_id -> driver_id)
  LEFT JOIN mod4_driver_links mdl ON mdl.user_id = ds.driver_id AND mdl.status = 'active'
  LEFT JOIN drivers d ON d.id = mdl.driver_id
  -- Fallback to profiles for name
  LEFT JOIN profiles p ON p.id = ds.driver_id
  -- Vehicle info
  LEFT JOIN vehicles v ON v.id = ds.vehicle_id
  -- Latest GPS position
  LEFT JOIN LATERAL (
    SELECT dge.lat, dge.lng, dge.heading, dge.speed_mps,
           dge.captured_at, dge.batch_id, dge.battery_level
    FROM driver_gps_events dge
    WHERE dge.session_id = ds.id
    ORDER BY dge.captured_at DESC
    LIMIT 1
  ) gps ON true
  -- Batch info
  LEFT JOIN delivery_batches db ON db.id = gps.batch_id
  WHERE ds.status = 'ACTIVE'
  ORDER BY gps.captured_at DESC NULLS LAST;
END;
$$;

-- =====================================================
-- 4. FIX start_driver_session()
-- =====================================================
-- The original function referenced columns that no longer exist.
-- Recreate to work with current schema.

CREATE OR REPLACE FUNCTION start_driver_session(
  p_driver_id UUID,
  p_device_id TEXT,
  p_vehicle_id UUID DEFAULT NULL,
  p_start_lat DOUBLE PRECISION DEFAULT NULL,
  p_start_lng DOUBLE PRECISION DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_linked_driver_id UUID;
BEGIN
  -- End any existing active session for this driver
  UPDATE driver_sessions
  SET status = 'INVALIDATED',
      invalidated_at = NOW(),
      invalidation_reason = 'new_session_started'
  WHERE driver_id = p_driver_id AND status = 'ACTIVE';

  -- Create new session
  INSERT INTO driver_sessions (
    driver_id, device_id, vehicle_id,
    access_token_hash, refresh_token_hash,
    device_metadata
  ) VALUES (
    p_driver_id, p_device_id, p_vehicle_id,
    'session_' || gen_random_uuid()::text,
    'refresh_' || gen_random_uuid()::text,
    p_device_info
  )
  RETURNING id INTO v_session_id;

  -- Update linked driver status to busy
  SELECT mdl.driver_id INTO v_linked_driver_id
  FROM mod4_driver_links mdl
  WHERE mdl.user_id = p_driver_id AND mdl.status = 'active';

  IF v_linked_driver_id IS NOT NULL THEN
    UPDATE drivers SET status = 'busy' WHERE id = v_linked_driver_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- =====================================================
-- 5. FIX end_driver_session()
-- =====================================================

CREATE OR REPLACE FUNCTION end_driver_session(
  p_session_id UUID,
  p_end_reason TEXT DEFAULT 'user_logout'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_linked_driver_id UUID;
BEGIN
  -- Invalidate session
  UPDATE driver_sessions
  SET status = 'INVALIDATED',
      invalidated_at = NOW(),
      invalidation_reason = p_end_reason
  WHERE id = p_session_id AND status = 'ACTIVE'
  RETURNING driver_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update linked driver status to available
  SELECT mdl.driver_id INTO v_linked_driver_id
  FROM mod4_driver_links mdl
  WHERE mdl.user_id = v_user_id AND mdl.status = 'active';

  IF v_linked_driver_id IS NOT NULL THEN
    UPDATE drivers SET status = 'available' WHERE id = v_linked_driver_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 6. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_active_drivers_with_positions() TO authenticated;
GRANT EXECUTE ON FUNCTION start_driver_session(UUID, TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION end_driver_session(UUID, TEXT) TO authenticated;

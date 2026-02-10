-- =====================================================
-- Fix Console Errors: FK joins, RPC signatures, RLS
-- =====================================================
-- Fixes:
-- 1. driver_sessions -> profiles FK for PostgREST joins
-- 2. get_event_distribution signature (restore p_days param)
-- 3. RLS policies for workspace members on driver_sessions
--    and driver_gps_events (needed for Realtime subscriptions)

-- =====================================================
-- 1. ADD FK: driver_sessions.driver_id -> profiles(id)
-- =====================================================
-- PostgREST embedded selects require a direct FK to the
-- target table. driver_sessions_driver_id_fkey points to
-- auth.users, not profiles. Adding a second FK to profiles
-- lets the admin sessions page join driver info.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'driver_sessions_driver_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.driver_sessions
      ADD CONSTRAINT driver_sessions_driver_id_profiles_fkey
      FOREIGN KEY (driver_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- =====================================================
-- 2. FIX: get_event_distribution - restore p_days param
-- =====================================================
-- The original function (20260117000001) accepted p_days INT.
-- Migration 20260202000001 redefined it with NO parameters,
-- creating a separate overload. The client still passes p_days,
-- causing a 404. Drop the no-param version and recreate with
-- the p_days parameter, keeping workspace scoping.

-- Drop the no-parameter overload
DROP FUNCTION IF EXISTS get_event_distribution();

-- Recreate with p_days parameter and workspace scoping
CREATE OR REPLACE FUNCTION get_event_distribution(p_days INT DEFAULT 7)
RETURNS TABLE (event_type TEXT, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  v_workspace_ids := get_user_workspace_ids_array();

  RETURN QUERY
  SELECT
    me.event_type,
    COUNT(*) AS count
  FROM mod4_events me
  JOIN driver_sessions ds ON me.session_id = ds.id
  WHERE ds.driver_id IN (
    SELECT wm.user_id FROM workspace_members wm
    WHERE wm.workspace_id = ANY(v_workspace_ids)
  )
    AND me.created_at >= CURRENT_DATE - p_days
  GROUP BY me.event_type
  ORDER BY count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_event_distribution(INT) TO authenticated;

-- =====================================================
-- 3. RLS: Workspace members can view driver_sessions
-- =====================================================
-- The live map and admin pages need to read driver_sessions
-- for users in the same workspace. Current RLS only allows
-- drivers to see their own sessions.

DO $$ BEGIN
  CREATE POLICY "Workspace members can view driver sessions"
    ON public.driver_sessions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. RLS: Workspace members can view driver_gps_events
-- =====================================================
-- Same pattern: admin/live-map users need to see GPS data.

DO $$ BEGIN
  CREATE POLICY "Workspace members can view gps events"
    ON public.driver_gps_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

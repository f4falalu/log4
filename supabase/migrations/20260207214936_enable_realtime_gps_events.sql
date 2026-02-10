-- =====================================================
-- Enable Realtime for GPS and Driver Events
-- =====================================================
-- The /map/live page subscribes to postgres_changes on
-- driver_gps_events and driver_events tables. These must
-- be in the supabase_realtime publication for subscriptions
-- to work.

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_gps_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_sessions;

-- =====================================================
-- Fix RLS policies for workspace members
-- =====================================================
-- The existing RLS on driver_gps_events only allows
-- workspace members to view GPS events, but the policy
-- references workspace_members which should work for
-- admin users on the live map.
--
-- Add a broader read policy for authenticated workspace
-- members to also read driver_events.

-- driver_events: workspace members can view all events
DO $$ BEGIN
  CREATE POLICY "Workspace members can view driver events"
    ON public.driver_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

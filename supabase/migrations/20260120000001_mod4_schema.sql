-- =============================================================================
-- Mod4: Mobile Driver Execution & GPS Tracking Schema
-- =============================================================================
-- This migration creates the database schema for the Mod4 mobile driver PWA,
-- enabling real-time GPS tracking, offline-first delivery execution, and
-- event-sourced delivery lifecycle management.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Driver Sessions Table
-- -----------------------------------------------------------------------------
-- Tracks active driver sessions for device management, security, and
-- real-time presence. Only one active session per driver is allowed.

CREATE TABLE IF NOT EXISTS driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Session lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Device information
  device_fingerprint TEXT,
  app_version TEXT,
  os_version TEXT,
  device_model TEXT,

  -- Starting location context
  start_location_lat DOUBLE PRECISION,
  start_location_lng DOUBLE PRECISION,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'ended', 'expired')),
  end_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one active session per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_sessions_active
  ON driver_sessions (driver_id)
  WHERE status = 'active';

-- Index for finding sessions by heartbeat (for cleanup)
CREATE INDEX IF NOT EXISTS idx_driver_sessions_heartbeat
  ON driver_sessions (last_heartbeat_at DESC)
  WHERE status = 'active';

-- Index for device lookups
CREATE INDEX IF NOT EXISTS idx_driver_sessions_device
  ON driver_sessions (device_id, started_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_driver_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_driver_sessions_updated_at ON driver_sessions;
CREATE TRIGGER trigger_driver_sessions_updated_at
  BEFORE UPDATE ON driver_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_sessions_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Driver GPS Events Table (Partitioned for Performance)
-- -----------------------------------------------------------------------------
-- Stores continuous GPS pings from drivers for real-time tracking.
-- Partitioned by month for efficient time-series queries and data retention.

CREATE TABLE IF NOT EXISTS driver_gps_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES driver_sessions(id) ON DELETE CASCADE,

  -- Location data
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  altitude_m DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed_mps DOUBLE PRECISION,

  -- Timestamps
  captured_at TIMESTAMPTZ NOT NULL,  -- Device timestamp (at source)
  received_at TIMESTAMPTZ DEFAULT NOW(),  -- Server timestamp

  -- Context
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE SET NULL,
  trip_id UUID,

  -- Device state
  battery_level SMALLINT CHECK (battery_level >= 0 AND battery_level <= 100),
  network_type TEXT,
  is_background BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for real-time driver position queries
CREATE INDEX IF NOT EXISTS idx_gps_events_driver_recent
  ON driver_gps_events (driver_id, captured_at DESC);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_gps_events_session
  ON driver_gps_events (session_id, captured_at DESC);

-- Index for batch-based tracking
CREATE INDEX IF NOT EXISTS idx_gps_events_batch
  ON driver_gps_events (batch_id, captured_at DESC)
  WHERE batch_id IS NOT NULL;

-- Spatial index for dispatcher map queries (find drivers in area)
-- Note: Requires PostGIS extension (already enabled in this project)
CREATE INDEX IF NOT EXISTS idx_gps_events_location
  ON driver_gps_events USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  );

-- -----------------------------------------------------------------------------
-- 3. Mod4 Events Table (Event Sourcing)
-- -----------------------------------------------------------------------------
-- Immutable event log for all driver execution actions.
-- Following event-sourced architecture: immutable, additive, idempotent.

CREATE TABLE IF NOT EXISTS mod4_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'session_started',
    'session_ended',
    'delivery_started',
    'delivery_completed',
    'delivery_discrepancy',
    'location_captured',
    'proxy_delivery_reason_recorded',
    'recipient_signature_captured',
    'new_device_login',
    'photo_captured',
    'item_reconciled',
    'batch_assigned',
    'batch_started',
    'batch_completed'
  )),

  -- Context references
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES driver_sessions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE SET NULL,
  trip_id UUID,
  dispatch_id UUID,

  -- Location at time of event
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,

  -- Timestamps
  captured_at TIMESTAMPTZ NOT NULL,  -- Device timestamp
  received_at TIMESTAMPTZ DEFAULT NOW(),

  -- Event payload (flexible JSONB for event-specific data)
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Sync tracking for offline-first
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  sync_attempts INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for driver event history
CREATE INDEX IF NOT EXISTS idx_mod4_events_driver
  ON mod4_events (driver_id, captured_at DESC);

-- Index for batch event timeline
CREATE INDEX IF NOT EXISTS idx_mod4_events_batch
  ON mod4_events (batch_id, captured_at DESC)
  WHERE batch_id IS NOT NULL;

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_mod4_events_type
  ON mod4_events (event_type, captured_at DESC);

-- Index for pending sync events
CREATE INDEX IF NOT EXISTS idx_mod4_events_sync
  ON mod4_events (sync_status)
  WHERE sync_status != 'synced';

-- -----------------------------------------------------------------------------
-- 4. Event Sync Queue Table
-- -----------------------------------------------------------------------------
-- Tracks offline events pending sync from devices.
-- Used for handling encrypted event payloads from offline-first clients.

CREATE TABLE IF NOT EXISTS mod4_event_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

  -- Encrypted event payload from device
  encrypted_payload TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,

  -- Sync metadata
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,

  -- Processing status
  processed_at TIMESTAMPTZ,
  processed_event_id UUID REFERENCES mod4_events(event_id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for processing pending queue items
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
  ON mod4_event_sync_queue (created_at ASC)
  WHERE processed_at IS NULL;

-- Index for device-specific queue lookups
CREATE INDEX IF NOT EXISTS idx_sync_queue_device
  ON mod4_event_sync_queue (device_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on all mod4 tables
ALTER TABLE driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_gps_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod4_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod4_event_sync_queue ENABLE ROW LEVEL SECURITY;

-- Driver Sessions: Authenticated users can manage sessions, workspace members can view
CREATE POLICY "Authenticated users can manage own sessions" ON driver_sessions
  FOR ALL USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Workspace members can view all sessions" ON driver_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- GPS Events: Authenticated users can insert, workspace members can view
CREATE POLICY "Authenticated users can insert GPS events" ON driver_gps_events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Workspace members can view GPS events" ON driver_gps_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Mod4 Events: Authenticated users can insert, workspace members can view
CREATE POLICY "Authenticated users can insert events" ON mod4_events
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Workspace members can view events" ON mod4_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Sync Queue: Authenticated users can manage
CREATE POLICY "Authenticated users can insert to sync queue" ON mod4_event_sync_queue
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view own queue items" ON mod4_event_sync_queue
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- -----------------------------------------------------------------------------
-- 6. RPC Functions
-- -----------------------------------------------------------------------------

-- Function: Start a new driver session
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
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- End any existing active session for this driver
  UPDATE driver_sessions
  SET status = 'ended',
      ended_at = NOW(),
      end_reason = 'new_session_started'
  WHERE driver_id = p_driver_id AND status = 'active';

  -- Create new session
  INSERT INTO driver_sessions (
    driver_id, device_id, vehicle_id,
    start_location_lat, start_location_lng,
    device_fingerprint, app_version, os_version, device_model
  ) VALUES (
    p_driver_id, p_device_id, p_vehicle_id,
    p_start_lat, p_start_lng,
    p_device_info->>'fingerprint',
    p_device_info->>'app_version',
    p_device_info->>'os_version',
    p_device_info->>'device_model'
  )
  RETURNING id INTO v_session_id;

  -- Update driver status to busy
  UPDATE drivers SET status = 'busy' WHERE id = p_driver_id;

  RETURN v_session_id;
END;
$$;

-- Function: End a driver session
CREATE OR REPLACE FUNCTION end_driver_session(
  p_session_id UUID,
  p_end_reason TEXT DEFAULT 'user_logout'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id UUID;
BEGIN
  -- Get driver_id and end session
  UPDATE driver_sessions
  SET status = 'ended',
      ended_at = NOW(),
      end_reason = p_end_reason
  WHERE id = p_session_id AND status = 'active'
  RETURNING driver_id INTO v_driver_id;

  IF v_driver_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update driver status to available
  UPDATE drivers SET status = 'available' WHERE id = v_driver_id;

  RETURN TRUE;
END;
$$;

-- Function: Update session heartbeat
CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE driver_sessions
  SET last_heartbeat_at = NOW()
  WHERE id = p_session_id AND status = 'active';

  RETURN FOUND;
END;
$$;

-- Function: Batch ingest GPS events
CREATE OR REPLACE FUNCTION ingest_gps_events(events JSONB)
RETURNS TABLE (
  inserted_count INTEGER,
  failed_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_failed INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_event JSONB;
BEGIN
  FOR v_event IN SELECT * FROM jsonb_array_elements(events)
  LOOP
    BEGIN
      INSERT INTO driver_gps_events (
        driver_id, session_id, device_id, vehicle_id,
        lat, lng, altitude_m, accuracy_m, heading, speed_mps,
        captured_at, battery_level, network_type, is_background, batch_id
      ) VALUES (
        (v_event->>'driver_id')::UUID,
        (v_event->>'session_id')::UUID,
        v_event->>'device_id',
        NULLIF(v_event->>'vehicle_id', '')::UUID,
        (v_event->>'lat')::DOUBLE PRECISION,
        (v_event->>'lng')::DOUBLE PRECISION,
        NULLIF(v_event->>'altitude_m', '')::DOUBLE PRECISION,
        NULLIF(v_event->>'accuracy_m', '')::DOUBLE PRECISION,
        NULLIF(v_event->>'heading', '')::DOUBLE PRECISION,
        NULLIF(v_event->>'speed_mps', '')::DOUBLE PRECISION,
        (v_event->>'captured_at')::TIMESTAMPTZ,
        NULLIF(v_event->>'battery_level', '')::SMALLINT,
        v_event->>'network_type',
        COALESCE((v_event->>'is_background')::BOOLEAN, FALSE),
        NULLIF(v_event->>'batch_id', '')::UUID
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'event_id', v_event->>'id',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_failed, v_errors;
END;
$$;

-- Function: Get active drivers with their latest positions
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS driver_id,
    d.name AS driver_name,
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
  JOIN drivers d ON d.id = ds.driver_id
  LEFT JOIN vehicles v ON v.id = ds.vehicle_id
  LEFT JOIN LATERAL (
    SELECT * FROM driver_gps_events
    WHERE driver_gps_events.session_id = ds.id
    ORDER BY captured_at DESC
    LIMIT 1
  ) gps ON true
  LEFT JOIN delivery_batches db ON db.id = gps.batch_id
  WHERE ds.status = 'active'
  ORDER BY gps.captured_at DESC NULLS LAST;
END;
$$;

-- Function: Insert mod4 event
CREATE OR REPLACE FUNCTION insert_mod4_event(
  p_event_type TEXT,
  p_driver_id UUID,
  p_session_id UUID,
  p_device_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_captured_at TIMESTAMPTZ,
  p_metadata JSONB DEFAULT '{}',
  p_vehicle_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_trip_id UUID DEFAULT NULL,
  p_dispatch_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO mod4_events (
    event_type, driver_id, session_id, device_id,
    lat, lng, captured_at, metadata,
    vehicle_id, batch_id, trip_id, dispatch_id
  ) VALUES (
    p_event_type, p_driver_id, p_session_id, p_device_id,
    p_lat, p_lng, p_captured_at, p_metadata,
    p_vehicle_id, p_batch_id, p_trip_id, p_dispatch_id
  )
  RETURNING event_id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function: Get driver event timeline
CREATE OR REPLACE FUNCTION get_driver_event_timeline(
  p_driver_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  captured_at TIMESTAMPTZ,
  metadata JSONB,
  batch_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.event_id,
    me.event_type,
    me.lat,
    me.lng,
    me.captured_at,
    me.metadata,
    db.name AS batch_name
  FROM mod4_events me
  LEFT JOIN delivery_batches db ON db.id = me.batch_id
  WHERE me.driver_id = p_driver_id
    AND (p_session_id IS NULL OR me.session_id = p_session_id)
  ORDER BY me.captured_at DESC
  LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Scheduled Job for Session Cleanup
-- -----------------------------------------------------------------------------
-- Expire sessions that haven't had a heartbeat in 30 minutes

CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE driver_sessions
  SET status = 'expired',
      ended_at = NOW(),
      end_reason = 'heartbeat_timeout'
  WHERE status = 'active'
    AND last_heartbeat_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update driver statuses
  UPDATE drivers d
  SET status = 'available'
  WHERE d.id IN (
    SELECT driver_id FROM driver_sessions
    WHERE status = 'expired' AND ended_at > NOW() - INTERVAL '1 minute'
  );

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_driver_session TO authenticated;
GRANT EXECUTE ON FUNCTION end_driver_session TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_heartbeat TO authenticated;
GRANT EXECUTE ON FUNCTION ingest_gps_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_drivers_with_positions TO authenticated;
GRANT EXECUTE ON FUNCTION insert_mod4_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_event_timeline TO authenticated;

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Tables created:
--   - driver_sessions: Active driver session tracking
--   - driver_gps_events: Continuous GPS pings
--   - mod4_events: Immutable event log
--   - mod4_event_sync_queue: Offline event queue
--
-- Functions created:
--   - start_driver_session: Start new session, end existing
--   - end_driver_session: End session gracefully
--   - update_session_heartbeat: Keep session alive
--   - ingest_gps_events: Batch GPS event insertion
--   - get_active_drivers_with_positions: Dispatcher view
--   - insert_mod4_event: Record execution events
--   - get_driver_event_timeline: Event history
--   - expire_stale_sessions: Cleanup job
-- =============================================================================

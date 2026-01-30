-- =====================================================
-- Driver Execution Layer: Sessions, Events, State Machine
-- =====================================================
-- Implements device + session model and execution handshake
-- for BIKO Mobile (PWA) and MOD4 driver operations.

-- =====================================================
-- ENUMS
-- =====================================================
-- Note: If enums exist from a partial migration, you may need to drop and recreate them
-- or run this migration twice (once to create/fix enums, once to create tables)

-- Driver Status (State Machine)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
    CREATE TYPE driver_status AS ENUM (
      'INACTIVE',
      'ACTIVE',
      'EN_ROUTE',
      'AT_STOP',
      'DELAYED',
      'COMPLETED',
      'SUSPENDED'
    );
  END IF;
END $$;

-- Event Types (Allowed Transitions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM (
      'ROUTE_STARTED',
      'ARRIVED_AT_STOP',
      'DEPARTED_STOP',
      'PROOF_CAPTURED',
      'DELAY_REPORTED',
      'ROUTE_COMPLETED',
      'ROUTE_CANCELLED',
      'SUPERVISOR_OVERRIDE'
    );
  END IF;
END $$;

-- =====================================================
-- DRIVER SESSIONS
-- =====================================================
-- One active session per driver (enforced via unique constraint)
-- Device change allowed, concurrent sessions denied

CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_metadata JSONB DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVALIDATED')),

  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver ON public.driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_status ON public.driver_sessions(status);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_device ON public.driver_sessions(device_id);

-- Enforce one active session per driver (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_session_per_driver
ON public.driver_sessions(driver_id) WHERE (status = 'ACTIVE');

-- =====================================================
-- DRIVER EVENTS
-- =====================================================
-- Append-only log of state transitions and critical events
-- Supports offline sync with review flagging

CREATE TABLE IF NOT EXISTS public.driver_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.driver_sessions(id) ON DELETE SET NULL,

  event_type event_type NOT NULL,
  driver_status driver_status NOT NULL,

  location GEOGRAPHY(POINT, 4326),
  metadata JSONB DEFAULT '{}',

  recorded_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  flagged_for_review BOOLEAN DEFAULT FALSE,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_events_driver ON public.driver_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_events_batch ON public.driver_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_driver_events_session ON public.driver_events(session_id);
CREATE INDEX IF NOT EXISTS idx_driver_events_type ON public.driver_events(event_type);
CREATE INDEX IF NOT EXISTS idx_driver_events_status ON public.driver_events(driver_status);
CREATE INDEX IF NOT EXISTS idx_driver_events_recorded_at ON public.driver_events(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_events_flagged ON public.driver_events(flagged_for_review) WHERE flagged_for_review = TRUE;

-- =====================================================
-- EXTEND DELIVERY_BATCHES
-- =====================================================
-- Add execution-specific columns to delivery_batches

DO $$
BEGIN
  -- Only add columns if driver_status column doesn't exist
  -- This avoids using newly added enum values in the same transaction
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_batches'
      AND column_name = 'driver_status'
  ) THEN
    ALTER TABLE public.delivery_batches
    ADD COLUMN driver_status driver_status DEFAULT 'INACTIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_batches'
      AND column_name = 'current_stop_index'
  ) THEN
    ALTER TABLE public.delivery_batches
    ADD COLUMN current_stop_index INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_batches'
      AND column_name = 'actual_start_time'
  ) THEN
    ALTER TABLE public.delivery_batches
    ADD COLUMN actual_start_time TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_batches'
      AND column_name = 'actual_end_time'
  ) THEN
    ALTER TABLE public.delivery_batches
    ADD COLUMN actual_end_time TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'delivery_batches'
      AND column_name = 'execution_metadata'
  ) THEN
    ALTER TABLE public.delivery_batches
    ADD COLUMN execution_metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Index for driver status queries
CREATE INDEX IF NOT EXISTS idx_delivery_batches_driver_status
ON public.delivery_batches(driver_status) WHERE driver_status IS NOT NULL;

-- =====================================================
-- STATE TRANSITION VALIDATION
-- =====================================================
-- Enforces state machine rules on driver_events insertion

CREATE OR REPLACE FUNCTION validate_driver_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  current_status driver_status;
  batch_assigned_driver UUID;
BEGIN
  -- Get current batch status
  SELECT driver_status, assigned_driver_id
  INTO current_status, batch_assigned_driver
  FROM public.delivery_batches
  WHERE id = NEW.batch_id;

  -- Verify driver is assigned to this batch
  IF batch_assigned_driver IS NULL THEN
    RAISE EXCEPTION 'Batch % has no assigned driver', NEW.batch_id;
  END IF;

  IF batch_assigned_driver != NEW.driver_id THEN
    RAISE EXCEPTION 'Driver % is not assigned to batch %', NEW.driver_id, NEW.batch_id;
  END IF;

  -- Validate state transitions
  CASE NEW.event_type
    WHEN 'ROUTE_STARTED' THEN
      IF current_status NOT IN ('INACTIVE', 'ACTIVE') THEN
        RAISE EXCEPTION 'Cannot start route from status %', current_status;
      END IF;
      IF NEW.driver_status != 'EN_ROUTE' THEN
        RAISE EXCEPTION 'ROUTE_STARTED must transition to EN_ROUTE';
      END IF;

    WHEN 'ARRIVED_AT_STOP' THEN
      IF current_status != 'EN_ROUTE' THEN
        RAISE EXCEPTION 'Cannot arrive at stop from status %', current_status;
      END IF;
      IF NEW.driver_status != 'AT_STOP' THEN
        RAISE EXCEPTION 'ARRIVED_AT_STOP must transition to AT_STOP';
      END IF;

    WHEN 'DEPARTED_STOP' THEN
      IF current_status != 'AT_STOP' THEN
        RAISE EXCEPTION 'Cannot depart from status %', current_status;
      END IF;
      IF NEW.driver_status != 'EN_ROUTE' THEN
        RAISE EXCEPTION 'DEPARTED_STOP must transition to EN_ROUTE';
      END IF;

    WHEN 'DELAY_REPORTED' THEN
      IF current_status NOT IN ('EN_ROUTE', 'AT_STOP') THEN
        RAISE EXCEPTION 'Cannot report delay from status %', current_status;
      END IF;
      IF NEW.driver_status != 'DELAYED' THEN
        RAISE EXCEPTION 'DELAY_REPORTED must transition to DELAYED';
      END IF;

    WHEN 'ROUTE_COMPLETED' THEN
      IF current_status NOT IN ('EN_ROUTE', 'AT_STOP', 'DELAYED') THEN
        RAISE EXCEPTION 'Cannot complete route from status %', current_status;
      END IF;
      IF NEW.driver_status != 'COMPLETED' THEN
        RAISE EXCEPTION 'ROUTE_COMPLETED must transition to COMPLETED';
      END IF;

    WHEN 'ROUTE_CANCELLED' THEN
      IF current_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Cannot cancel completed route';
      END IF;
      IF NEW.driver_status != 'INACTIVE' THEN
        RAISE EXCEPTION 'ROUTE_CANCELLED must transition to INACTIVE';
      END IF;

    WHEN 'SUPERVISOR_OVERRIDE' THEN
      -- Supervisors can force any transition (logged for audit)
      NULL;

    WHEN 'PROOF_CAPTURED' THEN
      -- Proof capture doesn't change status
      IF NEW.driver_status != current_status THEN
        RAISE EXCEPTION 'PROOF_CAPTURED must not change status';
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown event type: %', NEW.event_type;
  END CASE;

  -- Update batch status
  UPDATE public.delivery_batches
  SET
    driver_status = NEW.driver_status,
    actual_start_time = CASE
      WHEN NEW.event_type = 'ROUTE_STARTED' THEN NEW.recorded_at
      ELSE actual_start_time
    END,
    actual_end_time = CASE
      WHEN NEW.event_type = 'ROUTE_COMPLETED' THEN NEW.recorded_at
      ELSE actual_end_time
    END,
    updated_at = NOW()
  WHERE id = NEW.batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
DROP TRIGGER IF EXISTS trigger_validate_driver_state ON public.driver_events;
CREATE TRIGGER trigger_validate_driver_state
BEFORE INSERT ON public.driver_events
FOR EACH ROW
EXECUTE FUNCTION validate_driver_state_transition();

-- =====================================================
-- SESSION MANAGEMENT FUNCTIONS
-- =====================================================

-- Update last_active_at on session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.driver_sessions
  SET
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.session_id
    AND status = 'ACTIVE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_activity ON public.driver_events;
CREATE TRIGGER trigger_update_session_activity
AFTER INSERT ON public.driver_events
FOR EACH ROW
WHEN (NEW.session_id IS NOT NULL)
EXECUTE FUNCTION update_session_activity();

-- Update updated_at on session changes
CREATE OR REPLACE FUNCTION update_driver_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_driver_session_updated_at ON public.driver_sessions;
CREATE TRIGGER trigger_driver_session_updated_at
BEFORE UPDATE ON public.driver_sessions
FOR EACH ROW
EXECUTE FUNCTION update_driver_session_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Driver Sessions
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own sessions" ON public.driver_sessions;
CREATE POLICY "Drivers can view their own sessions"
ON public.driver_sessions FOR SELECT
USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can insert their own sessions" ON public.driver_sessions;
CREATE POLICY "Drivers can insert their own sessions"
ON public.driver_sessions FOR INSERT
WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their own sessions" ON public.driver_sessions;
CREATE POLICY "Drivers can update their own sessions"
ON public.driver_sessions FOR UPDATE
USING (driver_id = auth.uid());

-- Driver Events
ALTER TABLE public.driver_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own events" ON public.driver_events;
CREATE POLICY "Drivers can view their own events"
ON public.driver_events FOR SELECT
USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can insert their own events" ON public.driver_events;
CREATE POLICY "Drivers can insert their own events"
ON public.driver_events FOR INSERT
WITH CHECK (driver_id = auth.uid());

-- Note: Workspace-scoped access not implemented yet
-- delivery_batches table doesn't have workspace_id column
-- Supervisor access will be added when workspace model is integrated
-- For now, drivers can only see their own events (enforced above)

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.driver_sessions IS
'Driver authentication sessions. One active session per driver enforced. Device change allowed, concurrent sessions denied.';

COMMENT ON TABLE public.driver_events IS
'Append-only log of driver state transitions and critical events. Supports offline sync with geo-fence validation and supervisor review.';

COMMENT ON FUNCTION validate_driver_state_transition() IS
'Enforces state machine rules on driver event insertion. Validates transitions and updates batch status.';

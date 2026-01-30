-- =====================================================
-- CLEANUP SCRIPT FOR PARTIAL MIGRATION FAILURES
-- =====================================================
-- Run this ONLY if migration 20260130000002 failed due to enum issues
-- This will drop and recreate the enums, allowing the migration to succeed

-- Drop tables first (CASCADE will drop dependent objects like triggers)
DROP TABLE IF EXISTS public.driver_events CASCADE;
DROP TABLE IF EXISTS public.driver_sessions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS validate_driver_state_transition() CASCADE;
DROP FUNCTION IF EXISTS update_session_activity() CASCADE;
DROP FUNCTION IF EXISTS update_driver_session_updated_at() CASCADE;

-- Drop indexes (if they still exist separately)
DROP INDEX IF EXISTS public.idx_driver_events_status;
DROP INDEX IF EXISTS public.idx_driver_events_type;
DROP INDEX IF EXISTS public.idx_delivery_batches_driver_status;

-- Drop only the enum-dependent column (driver_status)
-- Other columns (actual_start_time, actual_end_time, etc.) may have been added
-- by other migrations and may have dependencies on analytics views.
-- The main migration will skip adding them if they already exist.
DO $$
BEGIN
  -- Drop driver_status (enum-dependent column from this migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_batches' AND column_name = 'driver_status'
  ) THEN
    -- Use CASCADE to drop any dependent objects (materialized views, etc.)
    -- This is safe because driver_status is specific to this migration
    EXECUTE 'ALTER TABLE public.delivery_batches DROP COLUMN driver_status CASCADE';
  END IF;

  -- Drop execution_metadata if it exists (also specific to this migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_batches' AND column_name = 'execution_metadata'
  ) THEN
    EXECUTE 'ALTER TABLE public.delivery_batches DROP COLUMN execution_metadata CASCADE';
  END IF;

  -- Drop current_stop_index if it exists (also specific to this migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'delivery_batches' AND column_name = 'current_stop_index'
  ) THEN
    EXECUTE 'ALTER TABLE public.delivery_batches DROP COLUMN current_stop_index CASCADE';
  END IF;

  -- NOTE: We do NOT drop actual_start_time or actual_end_time
  -- These may have been added by previous migrations and have analytics dependencies
  -- The main migration will skip adding them if they already exist
END $$;

-- Drop the enums
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS driver_status CASCADE;

-- Now re-run migration 20260130000002_driver_execution_layer.sql

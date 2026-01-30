-- =====================================================
-- Migration: Organization Status Tracking
-- =====================================================
-- Adds lifecycle state management to workspaces/organizations.
-- Implements the organization state machine:
-- org_created → admin_assigned → basic_config_complete → operational_config_complete → active
-- =====================================================

-- Step 1: Create organization status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_status') THEN
    CREATE TYPE org_status AS ENUM (
      'org_created',
      'admin_assigned',
      'basic_config_complete',
      'operational_config_complete',
      'active'
    );
  END IF;
END $$;

-- Step 2: Add organization lifecycle columns to workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS org_status org_status NOT NULL DEFAULT 'org_created';

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS operating_model TEXT CHECK (operating_model IN ('owned_fleet', 'contracted', 'hybrid'));

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS first_admin_assigned_at TIMESTAMPTZ;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS first_vehicle_added_at TIMESTAMPTZ;

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS first_warehouse_added_at TIMESTAMPTZ;

-- Step 3: Create organization status history table for audit trail
CREATE TABLE IF NOT EXISTS public.org_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  previous_status org_status,
  new_status org_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 4: Create indexes for status history
CREATE INDEX IF NOT EXISTS idx_org_status_history_workspace
  ON public.org_status_history(workspace_id);

CREATE INDEX IF NOT EXISTS idx_org_status_history_changed_at
  ON public.org_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_status_history_new_status
  ON public.org_status_history(new_status);

-- Step 5: Create index on workspaces for org_status queries
CREATE INDEX IF NOT EXISTS idx_workspaces_org_status
  ON public.workspaces(org_status);

-- Step 6: Create trigger function for status change logging
CREATE OR REPLACE FUNCTION log_org_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.org_status IS DISTINCT FROM NEW.org_status THEN
    INSERT INTO public.org_status_history (
      workspace_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.org_status,
      NEW.org_status,
      auth.uid(),
      'Status transition'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger for automatic status logging
DROP TRIGGER IF EXISTS org_status_change_trigger ON public.workspaces;
CREATE TRIGGER org_status_change_trigger
  AFTER UPDATE OF org_status ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION log_org_status_change();

-- Step 8: Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_org_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "org_created": ["admin_assigned"],
    "admin_assigned": ["basic_config_complete"],
    "basic_config_complete": ["operational_config_complete"],
    "operational_config_complete": ["active"],
    "active": []
  }'::jsonb;
  allowed_next_states JSONB;
BEGIN
  -- Skip validation if status hasn't changed
  IF OLD.org_status = NEW.org_status THEN
    RETURN NEW;
  END IF;

  -- Get allowed next states for current status
  allowed_next_states := valid_transitions->OLD.org_status::text;

  -- Check if transition is valid
  IF NOT (allowed_next_states ? NEW.org_status::text) THEN
    RAISE EXCEPTION 'Invalid organization status transition: % -> %. Allowed transitions: %',
      OLD.org_status, NEW.org_status, allowed_next_states;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for status transition validation
DROP TRIGGER IF EXISTS validate_org_status_transition_trigger ON public.workspaces;
CREATE TRIGGER validate_org_status_transition_trigger
  BEFORE UPDATE OF org_status ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION validate_org_status_transition();

-- Step 10: Enable RLS on status history
ALTER TABLE public.org_status_history ENABLE ROW LEVEL SECURITY;

-- Step 11: RLS policies for status history
DROP POLICY IF EXISTS "Authenticated users can view org status history" ON public.org_status_history;
CREATE POLICY "Authenticated users can view org status history"
  ON public.org_status_history FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can insert org status history" ON public.org_status_history;
CREATE POLICY "System can insert org status history"
  ON public.org_status_history FOR INSERT
  WITH CHECK (TRUE);

-- Step 12: Add comments for documentation
COMMENT ON COLUMN public.workspaces.org_status IS
'Organization lifecycle status: org_created → admin_assigned → basic_config_complete → operational_config_complete → active';

COMMENT ON COLUMN public.workspaces.operating_model IS
'Fleet operating model: owned_fleet (company owns vehicles), contracted (third-party), hybrid (mixed)';

COMMENT ON TABLE public.org_status_history IS
'Audit trail for organization status transitions. Immutable log of all status changes.';

-- Step 13: Verification
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'workspaces'
  AND column_name IN ('org_status', 'operating_model', 'primary_contact_name', 'primary_contact_email');

  IF v_column_count < 4 THEN
    RAISE EXCEPTION 'Migration verification failed: Expected 4 new columns, found %', v_column_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Organization Status Tracking Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added columns: org_status, operating_model, primary_contact_*';
  RAISE NOTICE 'Created table: org_status_history';
  RAISE NOTICE 'Status flow: org_created → admin_assigned → basic_config_complete → operational_config_complete → active';
  RAISE NOTICE '=================================================================';
END $$;

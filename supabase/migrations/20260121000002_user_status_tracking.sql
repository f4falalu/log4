-- =====================================================
-- Migration: User Status Tracking
-- =====================================================
-- Adds lifecycle state management to user profiles.
-- Implements the user state machine:
-- invited → registered → role_assigned → active
-- =====================================================

-- Step 1: Create user status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM (
      'invited',
      'registered',
      'role_assigned',
      'active'
    );
  END IF;
END $$;

-- Step 2: Add user lifecycle columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_status user_status NOT NULL DEFAULT 'registered';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Step 3: Create user status history table for audit trail
CREATE TABLE IF NOT EXISTS public.user_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_status user_status,
  new_status user_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 4: Create indexes for status history
CREATE INDEX IF NOT EXISTS idx_user_status_history_user
  ON public.user_status_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_status_history_changed_at
  ON public.user_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_status_history_new_status
  ON public.user_status_history(new_status);

-- Step 5: Create index on profiles for user_status queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_status
  ON public.profiles(user_status);

-- Step 6: Create trigger function for status change logging
CREATE OR REPLACE FUNCTION log_user_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.user_status IS DISTINCT FROM NEW.user_status THEN
    INSERT INTO public.user_status_history (
      user_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.user_status,
      NEW.user_status,
      auth.uid(),
      'Status transition'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger for automatic status logging
DROP TRIGGER IF EXISTS user_status_change_trigger ON public.profiles;
CREATE TRIGGER user_status_change_trigger
  AFTER UPDATE OF user_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_status_change();

-- Step 8: Create function to validate user status transitions
CREATE OR REPLACE FUNCTION validate_user_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "invited": ["registered"],
    "registered": ["role_assigned"],
    "role_assigned": ["active"],
    "active": []
  }'::jsonb;
  allowed_next_states JSONB;
BEGIN
  -- Skip validation if status hasn't changed
  IF OLD.user_status = NEW.user_status THEN
    RETURN NEW;
  END IF;

  -- Get allowed next states for current status
  allowed_next_states := valid_transitions->OLD.user_status::text;

  -- Check if transition is valid
  IF NOT (allowed_next_states ? NEW.user_status::text) THEN
    RAISE EXCEPTION 'Invalid user status transition: % -> %. Allowed transitions: %',
      OLD.user_status, NEW.user_status, allowed_next_states;
  END IF;

  -- Set timestamps based on new status
  CASE NEW.user_status
    WHEN 'registered' THEN
      NEW.registered_at := COALESCE(NEW.registered_at, NOW());
    WHEN 'role_assigned' THEN
      NEW.role_assigned_at := COALESCE(NEW.role_assigned_at, NOW());
    WHEN 'active' THEN
      NEW.activated_at := COALESCE(NEW.activated_at, NOW());
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for status transition validation
DROP TRIGGER IF EXISTS validate_user_status_transition_trigger ON public.profiles;
CREATE TRIGGER validate_user_status_transition_trigger
  BEFORE UPDATE OF user_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_status_transition();

-- Step 10: Enable RLS on status history
ALTER TABLE public.user_status_history ENABLE ROW LEVEL SECURITY;

-- Step 11: RLS policies for status history
DROP POLICY IF EXISTS "Users can view their own status history" ON public.user_status_history;
CREATE POLICY "Users can view their own status history"
  ON public.user_status_history FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all user status history" ON public.user_status_history;
CREATE POLICY "Admins can view all user status history"
  ON public.user_status_history FOR SELECT
  USING (has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System can insert user status history" ON public.user_status_history;
CREATE POLICY "System can insert user status history"
  ON public.user_status_history FOR INSERT
  WITH CHECK (TRUE);

-- Step 12: Add comments for documentation
COMMENT ON COLUMN public.profiles.user_status IS
'User lifecycle status: invited → registered → role_assigned → active';

COMMENT ON COLUMN public.profiles.invited_by IS
'UUID of the admin/owner who invited this user (NULL for self-signup)';

COMMENT ON COLUMN public.profiles.onboarding_completed IS
'Whether the user has completed the onboarding checklist';

COMMENT ON TABLE public.user_status_history IS
'Audit trail for user status transitions. Immutable log of all status changes.';

-- Step 13: Verification
DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('user_status', 'invited_by', 'invited_at', 'registered_at', 'role_assigned_at', 'activated_at');

  IF v_column_count < 6 THEN
    RAISE EXCEPTION 'Migration verification failed: Expected 6 new columns, found %', v_column_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'User Status Tracking Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Added columns: user_status, invited_by, invited_at, registered_at, role_assigned_at, activated_at';
  RAISE NOTICE 'Created table: user_status_history';
  RAISE NOTICE 'Status flow: invited → registered → role_assigned → active';
  RAISE NOTICE '=================================================================';
END $$;

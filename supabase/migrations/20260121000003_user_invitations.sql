-- =====================================================
-- Migration: User Invitation System
-- =====================================================
-- Creates a secure invitation system for onboarding new users.
-- Supports pre-assigned roles and workspace membership.
-- =====================================================

-- Step 1: Create invitation status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM (
      'pending',
      'accepted',
      'expired',
      'revoked'
    );
  END IF;
END $$;

-- Step 2: Create user invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invitation target
  email TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Pre-assigned roles (applied on acceptance)
  pre_assigned_role app_role NOT NULL,
  workspace_role TEXT NOT NULL DEFAULT 'member' CHECK (workspace_role IN ('owner', 'admin', 'member', 'viewer')),

  -- Secure token for invitation link
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Status tracking
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Invitation metadata
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Personal message from inviter (optional)
  personal_message TEXT,

  -- Resolution tracking
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  expired_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create unique constraint to prevent duplicate pending invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.user_invitations(email, workspace_id)
  WHERE status = 'pending';

-- Step 4: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON public.user_invitations(invitation_token)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON public.user_invitations(email);

CREATE INDEX IF NOT EXISTS idx_invitations_workspace
  ON public.user_invitations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_invitations_expires
  ON public.user_invitations(expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
  ON public.user_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON public.user_invitations(status);

-- Step 5: Create function to auto-expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark expired invitations
  UPDATE public.user_invitations
  SET
    status = 'expired',
    expired_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to handle invitation status changes
CREATE OR REPLACE FUNCTION handle_invitation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update timestamps based on status
  CASE NEW.status
    WHEN 'accepted' THEN
      NEW.accepted_at := COALESCE(NEW.accepted_at, NOW());
    WHEN 'revoked' THEN
      NEW.revoked_at := COALESCE(NEW.revoked_at, NOW());
    WHEN 'expired' THEN
      NEW.expired_at := COALESCE(NEW.expired_at, NOW());
    ELSE
      NULL;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for invitation status changes
DROP TRIGGER IF EXISTS invitation_status_change_trigger ON public.user_invitations;
CREATE TRIGGER invitation_status_change_trigger
  BEFORE UPDATE OF status ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_status_change();

-- Step 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invitation_updated_at_trigger ON public.user_invitations;
CREATE TRIGGER invitation_updated_at_trigger
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

-- Step 9: Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Step 10: RLS policies for invitations

-- Users can view invitations sent to their email
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.user_invitations;
CREATE POLICY "Users can view invitations to their email"
  ON public.user_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Workspace owners/admins can view all invitations for their workspace
DROP POLICY IF EXISTS "Workspace admins can view workspace invitations" ON public.user_invitations;
CREATE POLICY "Workspace admins can view workspace invitations"
  ON public.user_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners/admins can create invitations
DROP POLICY IF EXISTS "Workspace admins can create invitations" ON public.user_invitations;
CREATE POLICY "Workspace admins can create invitations"
  ON public.user_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND invited_by = auth.uid()
  );

-- Workspace owners/admins can revoke invitations
DROP POLICY IF EXISTS "Workspace admins can update invitations" ON public.user_invitations;
CREATE POLICY "Workspace admins can update invitations"
  ON public.user_invitations FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- System admins can manage all invitations
DROP POLICY IF EXISTS "System admins can manage all invitations" ON public.user_invitations;
CREATE POLICY "System admins can manage all invitations"
  ON public.user_invitations FOR ALL
  USING (has_role(auth.uid(), 'system_admin'));

-- Step 11: Create view for pending invitations with workspace info
CREATE OR REPLACE VIEW public.pending_invitations_view AS
SELECT
  ui.id,
  ui.email,
  ui.workspace_id,
  w.name AS workspace_name,
  ui.pre_assigned_role,
  ui.workspace_role,
  ui.invitation_token,
  ui.invited_by,
  p.full_name AS invited_by_name,
  ui.invited_at,
  ui.expires_at,
  ui.personal_message,
  EXTRACT(EPOCH FROM (ui.expires_at - NOW())) / 3600 AS hours_until_expiry
FROM public.user_invitations ui
JOIN public.workspaces w ON w.id = ui.workspace_id
LEFT JOIN public.profiles p ON p.id = ui.invited_by
WHERE ui.status = 'pending'
AND ui.expires_at > NOW();

-- Step 12: Add comments for documentation
COMMENT ON TABLE public.user_invitations IS
'Secure user invitation system for onboarding. Each invitation has a unique token, pre-assigned roles, and expiration.';

COMMENT ON COLUMN public.user_invitations.invitation_token IS
'Unique UUID token used in invitation links. Only valid while status is pending.';

COMMENT ON COLUMN public.user_invitations.pre_assigned_role IS
'Application role to be assigned to user upon accepting invitation.';

COMMENT ON COLUMN public.user_invitations.workspace_role IS
'Workspace membership role: owner, admin, member, or viewer.';

-- Step 13: Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_invitations'
  ) THEN
    RAISE EXCEPTION 'Migration verification failed: user_invitations table not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'User Invitation System Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created table: user_invitations';
  RAISE NOTICE 'Created view: pending_invitations_view';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Secure UUID tokens for invitation links';
  RAISE NOTICE '  - Pre-assigned app_role and workspace_role';
  RAISE NOTICE '  - 7-day expiration by default';
  RAISE NOTICE '  - RLS policies for workspace admin access';
  RAISE NOTICE '=================================================================';
END $$;

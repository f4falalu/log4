-- Create all_invitations_view (SECURITY DEFINER)
-- Shows all invitations (any status) for workspaces the user belongs to.
-- Companion to pending_invitations_view which only shows pending ones.

BEGIN;

CREATE OR REPLACE VIEW public.all_invitations_view
WITH (security_invoker = false)
AS
SELECT
  ui.id,
  ui.email,
  ui.workspace_id,
  w.name AS workspace_name,
  ui.pre_assigned_role,
  ui.workspace_role,
  ui.invitation_token,
  ui.status,
  ui.invited_by,
  p.full_name AS invited_by_name,
  ui.invited_at,
  ui.expires_at,
  ui.accepted_at,
  ui.revoked_at,
  ui.personal_message
FROM public.user_invitations ui
JOIN public.workspaces w ON w.id = ui.workspace_id
LEFT JOIN public.profiles p ON p.id = ui.invited_by
WHERE ui.workspace_id IN (
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
)
ORDER BY ui.invited_at DESC;

REVOKE ALL ON public.all_invitations_view FROM anon;
GRANT SELECT ON public.all_invitations_view TO authenticated;

COMMIT;

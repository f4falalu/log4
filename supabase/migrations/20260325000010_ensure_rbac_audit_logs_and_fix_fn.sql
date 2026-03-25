-- Ensure rbac_audit_logs table exists (may have been skipped previously)
CREATE TABLE IF NOT EXISTS public.rbac_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'permission_granted', 'permission_revoked', 'permissions_reset',
    'role_changed', 'member_added', 'member_removed',
    'workspace_created', 'settings_updated'
  )),
  target_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_workspace_time
  ON public.rbac_audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_user
  ON public.rbac_audit_logs(user_id);

ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can view audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rbac_audit_logs' AND policyname = 'workspace_members_can_view_audit'
  ) THEN
    CREATE POLICY "workspace_members_can_view_audit"
      ON public.rbac_audit_logs FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = rbac_audit_logs.workspace_id
            AND wm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- RBAC System - Part 5: Audit Logging
-- =====================================================
-- Creates comprehensive audit logging system for:
--   - Financial state changes (requisitions, invoices)
--   - Inventory adjustments
--   - Dispatch actions (batches)
--   - Role/permission changes
--   - User management
--
-- All critical actions are logged immutably.
-- =====================================================

-- =====================================================
-- 1. CREATE AUDIT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- preserve logs even if user deleted
  action TEXT NOT NULL, -- permission code (e.g., 'batch.dispatch')
  resource TEXT NOT NULL, -- table name (e.g., 'batch')
  resource_id UUID, -- ID of the affected record
  previous_state JSONB, -- state before change
  new_state JSONB, -- state after change
  state_diff JSONB, -- computed diff for quick viewing
  ip_address INET, -- user's IP address
  user_agent TEXT, -- browser/client info
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  metadata JSONB DEFAULT '{}', -- flexible storage for action-specific data
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium'
);

-- Indexes for fast querying
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity) WHERE severity IN ('high', 'critical');

-- Composite index for common query pattern
CREATE INDEX idx_audit_logs_org_timestamp ON public.audit_logs(organization_id, timestamp DESC);

-- GIN index for state diff queries
CREATE INDEX idx_audit_logs_state_diff ON public.audit_logs USING GIN (state_diff);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view audit logs in their organization"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only system admins can delete audit logs (for GDPR compliance)
CREATE POLICY "Only system admins can manage audit logs"
  ON public.audit_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- Prevent updates (immutable audit trail)
CREATE POLICY "Audit logs are immutable"
  ON public.audit_logs FOR UPDATE
  TO authenticated
  USING (false);

-- =====================================================
-- 2. CREATE AUDIT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  _action TEXT;
  _organization_id UUID;
  _severity TEXT;
  _diff JSONB;
BEGIN
  -- Determine action from trigger argument
  _action := TG_ARGV[0];

  -- Extract organization_id
  _organization_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Determine severity
  _severity := COALESCE(TG_ARGV[1], 'medium');

  -- Compute state diff (only changed fields)
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value)
    INTO _diff
    FROM (
      SELECT key, value
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
    ) AS changed_fields;
  ELSE
    _diff := NULL;
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource,
    resource_id,
    previous_state,
    new_state,
    state_diff,
    timestamp,
    severity
  ) VALUES (
    _organization_id,
    auth.uid(),
    _action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    _diff,
    now(),
    _severity
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE MANUAL AUDIT LOG FUNCTION
-- =====================================================
-- For logging actions that don't have triggers

CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action TEXT,
  _resource TEXT,
  _resource_id UUID,
  _previous_state JSONB DEFAULT NULL,
  _new_state JSONB DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _severity TEXT DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
  _audit_id UUID;
  _organization_id UUID;
BEGIN
  -- Try to extract organization_id from new_state or previous_state
  _organization_id := COALESCE(
    (_new_state->>'organization_id')::uuid,
    (_previous_state->>'organization_id')::uuid
  );

  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource,
    resource_id,
    previous_state,
    new_state,
    metadata,
    severity,
    timestamp
  ) VALUES (
    _organization_id,
    auth.uid(),
    _action,
    _resource,
    _resource_id,
    _previous_state,
    _new_state,
    _metadata,
    _severity,
    now()
  ) RETURNING id INTO _audit_id;

  RETURN _audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE AUDIT VIEWS
-- =====================================================

-- Recent critical audit events
CREATE OR REPLACE VIEW public.audit_logs_critical AS
SELECT
  al.id,
  al.timestamp,
  al.action,
  al.resource,
  al.resource_id,
  p.full_name AS user_name,
  u.email AS user_email,
  al.previous_state,
  al.new_state,
  al.state_diff,
  al.metadata
FROM public.audit_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
LEFT JOIN auth.users u ON al.user_id = u.id
WHERE al.severity IN ('high', 'critical')
ORDER BY al.timestamp DESC;

-- Audit summary by user
CREATE OR REPLACE VIEW public.audit_summary_by_user AS
SELECT
  summary.user_id,
  summary.user_name,
  summary.user_email,
  summary.total_actions,
  summary.critical_actions,
  summary.high_actions,
  summary.last_action_at,
  action_counts.action_counts
FROM (
  SELECT
    al.user_id,
    p.full_name AS user_name,
    u.email AS user_email,
    COUNT(*) AS total_actions,
    COUNT(*) FILTER (WHERE severity = 'critical') AS critical_actions,
    COUNT(*) FILTER (WHERE severity = 'high') AS high_actions,
    MAX(al.timestamp) AS last_action_at
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  LEFT JOIN auth.users u ON al.user_id = u.id
  GROUP BY al.user_id, p.full_name, u.email
) summary
LEFT JOIN (
  SELECT
    user_id,
    jsonb_object_agg(action, action_count) AS action_counts
  FROM (
    SELECT
      user_id,
      action,
      COUNT(*) AS action_count
    FROM public.audit_logs
    GROUP BY user_id, action
  ) action_summary
  GROUP BY user_id
) action_counts ON summary.user_id = action_counts.user_id;

-- Audit summary by resource
CREATE OR REPLACE VIEW public.audit_summary_by_resource AS
SELECT
  al.resource,
  COUNT(*) AS total_changes,
  COUNT(DISTINCT al.resource_id) AS unique_resources_affected,
  COUNT(DISTINCT al.user_id) AS unique_users,
  MAX(al.timestamp) AS last_modified_at
FROM public.audit_logs al
GROUP BY al.resource;

-- =====================================================
-- 5. ATTACH AUDIT TRIGGERS TO CRITICAL TABLES
-- =====================================================
-- NOTE: These tables must exist. If they don't, triggers will be created
-- when the tables are created in future migrations.

-- REQUISITIONS (critical = high)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'requisitions') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_requisitions ON public.requisitions';
    EXECUTE 'CREATE TRIGGER audit_requisitions
      AFTER INSERT OR UPDATE OR DELETE ON public.requisitions
      FOR EACH ROW
      EXECUTE FUNCTION public.create_audit_log_trigger(''requisition.change'', ''high'')';
    RAISE NOTICE 'Audit trigger attached to: requisitions';
  END IF;
END $$;

-- INVOICES (critical = high)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_invoices ON public.invoices';
    EXECUTE 'CREATE TRIGGER audit_invoices
      AFTER INSERT OR UPDATE OR DELETE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.create_audit_log_trigger(''invoice.change'', ''high'')';
    RAISE NOTICE 'Audit trigger attached to: invoices';
  END IF;
END $$;

-- BATCHES (critical = high)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'batches') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_batches ON public.batches';
    EXECUTE 'CREATE TRIGGER audit_batches
      AFTER INSERT OR UPDATE OR DELETE ON public.batches
      FOR EACH ROW
      EXECUTE FUNCTION public.create_audit_log_trigger(''batch.change'', ''high'')';
    RAISE NOTICE 'Audit trigger attached to: batches';
  END IF;
END $$;

-- USER_ROLES (critical = critical)
CREATE OR REPLACE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_trigger('role.change', 'critical');

-- ROLE_PERMISSIONS (critical = critical)
CREATE OR REPLACE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_trigger('permission.change', 'critical');

-- USER_PERMISSION_SETS (critical = critical)
CREATE OR REPLACE TRIGGER audit_user_permission_sets
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permission_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_trigger('permission_set.change', 'critical');

-- USER_SCOPE_BINDINGS (critical = high)
CREATE OR REPLACE TRIGGER audit_user_scope_bindings
  AFTER INSERT OR UPDATE OR DELETE ON public.user_scope_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_trigger('scope.change', 'high');

-- =====================================================
-- 6. CREATE AUDIT RETENTION FUNCTION
-- =====================================================
-- For GDPR compliance and storage management

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  _retention_days INTEGER DEFAULT 365
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.audit_logs
    WHERE timestamp < (now() - (_retention_days || ' days')::interval)
      AND severity NOT IN ('critical') -- never delete critical logs
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS
  'Removes audit logs older than specified days (except critical severity). Default: 365 days.';

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'audit_%';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Audit Logging Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Table created: audit_logs';
  RAISE NOTICE 'Audit triggers attached: %', trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Monitored tables (with triggers):';
  RAISE NOTICE '  - requisitions (high severity)';
  RAISE NOTICE '  - invoices (high severity)';
  RAISE NOTICE '  - batches (high severity)';
  RAISE NOTICE '  - user_roles (critical severity)';
  RAISE NOTICE '  - role_permissions (critical severity)';
  RAISE NOTICE '  - user_permission_sets (critical severity)';
  RAISE NOTICE '  - user_scope_bindings (high severity)';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - create_audit_log_trigger() - automatic trigger function';
  RAISE NOTICE '  - create_audit_log() - manual logging function';
  RAISE NOTICE '  - cleanup_old_audit_logs(days) - retention management';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - audit_logs_critical (high/critical events only)';
  RAISE NOTICE '  - audit_summary_by_user';
  RAISE NOTICE '  - audit_summary_by_resource';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  - Users can view logs in their organization';
  RAISE NOTICE '  - Logs are immutable (no updates allowed)';
  RAISE NOTICE '  - Only system admins can delete (GDPR compliance)';
  RAISE NOTICE '=================================================================';
END $$;

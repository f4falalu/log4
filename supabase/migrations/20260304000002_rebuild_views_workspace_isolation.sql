-- Migration: Rebuild auth-exposing views with workspace isolation
--
-- Problem: 5 views join auth.users and return ALL data across all organizations.
-- Fix: Add workspace filtering using auth.uid() so users only see data from
--      their own workspaces. Views remain SECURITY DEFINER (required to access
--      auth.users), but the WHERE clauses enforce workspace isolation.
--
-- auth.uid() works inside SECURITY DEFINER views — it returns the session
-- user, not the view owner.

BEGIN;

-- ============================================================
-- 1. admin_users_view — only show users in caller's workspaces
-- ============================================================
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

CREATE VIEW public.admin_users_view
WITH (security_invoker = false)
AS
SELECT
  u.id,
  u.email,
  u.phone,
  u.created_at,
  u.last_sign_in_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.raw_user_meta_data AS user_metadata,
  u.raw_app_meta_data AS app_metadata,
  p.full_name,
  p.avatar_url,
  p.updated_at AS profile_updated_at,
  COALESCE(
    u.raw_user_meta_data->>'organization',
    u.raw_app_meta_data->>'organization',
    p.organization,
    'default'
  ) AS organization,
  COALESCE(
    (SELECT array_agg(ur.role::text ORDER BY ur.role)
     FROM public.user_roles ur WHERE ur.user_id = u.id),
    ARRAY[]::text[]
  ) AS roles,
  (SELECT COUNT(*) FROM public.user_roles ur WHERE ur.user_id = u.id) AS role_count,
  (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.user_id = u.id) AS workspace_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id IN (
  SELECT wm2.user_id
  FROM public.workspace_members wm1
  INNER JOIN public.workspace_members wm2
    ON wm1.workspace_id = wm2.workspace_id
  WHERE wm1.user_id = auth.uid()
);

REVOKE ALL ON public.admin_users_view FROM anon;
REVOKE ALL ON public.admin_users_view FROM authenticated;
GRANT SELECT ON public.admin_users_view TO authenticated;

-- ============================================================
-- 2. audit_logs_critical — filter by caller's workspace
-- ============================================================
DROP VIEW IF EXISTS public.audit_logs_critical CASCADE;

CREATE VIEW public.audit_logs_critical
WITH (security_invoker = false)
AS
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
  AND al.organization_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
ORDER BY al.timestamp DESC;

REVOKE ALL ON public.audit_logs_critical FROM anon;
REVOKE ALL ON public.audit_logs_critical FROM authenticated;
GRANT SELECT ON public.audit_logs_critical TO authenticated;

-- ============================================================
-- 3. audit_summary_by_user — filter by caller's workspace
-- ============================================================
DROP VIEW IF EXISTS public.audit_summary_by_user CASCADE;

CREATE VIEW public.audit_summary_by_user
WITH (security_invoker = false)
AS
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
    COUNT(*) FILTER (WHERE al.severity = 'critical') AS critical_actions,
    COUNT(*) FILTER (WHERE al.severity = 'high') AS high_actions,
    MAX(al.timestamp) AS last_action_at
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  LEFT JOIN auth.users u ON al.user_id = u.id
  WHERE al.organization_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  )
  GROUP BY al.user_id, p.full_name, u.email
) summary
LEFT JOIN (
  SELECT
    user_id,
    jsonb_object_agg(action, action_count) AS action_counts
  FROM (
    SELECT
      al2.user_id,
      al2.action,
      COUNT(*) AS action_count
    FROM public.audit_logs al2
    WHERE al2.organization_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    GROUP BY al2.user_id, al2.action
  ) action_summary
  GROUP BY user_id
) action_counts ON summary.user_id = action_counts.user_id;

REVOKE ALL ON public.audit_summary_by_user FROM anon;
REVOKE ALL ON public.audit_summary_by_user FROM authenticated;
GRANT SELECT ON public.audit_summary_by_user TO authenticated;

-- ============================================================
-- 4. audit_summary_by_resource — filter by caller's workspace
-- ============================================================
DROP VIEW IF EXISTS public.audit_summary_by_resource CASCADE;

CREATE VIEW public.audit_summary_by_resource
WITH (security_invoker = false)
AS
SELECT
  al.resource,
  COUNT(*) AS total_actions,
  COUNT(*) FILTER (WHERE al.severity = 'critical') AS critical_actions,
  COUNT(*) FILTER (WHERE al.severity = 'high') AS high_actions,
  COUNT(DISTINCT al.user_id) AS unique_users,
  MAX(al.timestamp) AS last_action_at
FROM public.audit_logs al
WHERE al.organization_id IN (
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
)
GROUP BY al.resource;

REVOKE ALL ON public.audit_summary_by_resource FROM anon;
REVOKE ALL ON public.audit_summary_by_resource FROM authenticated;
GRANT SELECT ON public.audit_summary_by_resource TO authenticated;

-- ============================================================
-- 5. user_scopes_detailed — only show scopes for users in
--    the same workspace as the caller
-- ============================================================
DROP VIEW IF EXISTS public.user_scopes_detailed CASCADE;

CREATE VIEW public.user_scopes_detailed
WITH (security_invoker = false)
AS
SELECT
  usb.id,
  usb.user_id,
  u.email AS user_email,
  p.full_name AS user_name,
  usb.scope_type,
  usb.scope_id,
  CASE usb.scope_type
    WHEN 'warehouse' THEN w.name
    WHEN 'program' THEN prog.name
    WHEN 'zone' THEN z.name
    WHEN 'facility' THEN f.name
    ELSE NULL
  END AS scope_name,
  usb.assigned_at,
  usb.expires_at,
  usb.assigned_by,
  assigner_u.email AS assigned_by_email
FROM public.user_scope_bindings usb
LEFT JOIN auth.users u ON usb.user_id = u.id
LEFT JOIN public.profiles p ON usb.user_id = p.id
LEFT JOIN public.warehouses w ON usb.scope_type = 'warehouse' AND usb.scope_id = w.id
LEFT JOIN public.programs prog ON usb.scope_type = 'program' AND usb.scope_id = prog.id
LEFT JOIN public.zones z ON usb.scope_type = 'zone' AND usb.scope_id = z.id
LEFT JOIN public.facilities f ON usb.scope_type = 'facility' AND usb.scope_id = f.id
LEFT JOIN auth.users assigner_u ON usb.assigned_by = assigner_u.id
WHERE (usb.expires_at IS NULL OR usb.expires_at > now())
  AND usb.user_id IN (
    SELECT wm2.user_id
    FROM public.workspace_members wm1
    INNER JOIN public.workspace_members wm2
      ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
  );

REVOKE ALL ON public.user_scopes_detailed FROM anon;
REVOKE ALL ON public.user_scopes_detailed FROM authenticated;
GRANT SELECT ON public.user_scopes_detailed TO authenticated;

-- ============================================================
-- 6. workspace_isolation_audit — only show caller's workspaces
-- ============================================================
DROP VIEW IF EXISTS public.workspace_isolation_audit CASCADE;

CREATE VIEW public.workspace_isolation_audit
WITH (security_invoker = false)
AS
SELECT
  w.id AS workspace_id,
  w.name AS workspace_name,
  w.is_active,
  COUNT(DISTINCT wm.user_id) AS user_count,
  COUNT(DISTINCT CASE WHEN ur.role = 'system_admin' THEN ur.user_id END) AS system_admin_count,
  array_agg(DISTINCT au.email ORDER BY au.email)
    FILTER (WHERE au.email IS NOT NULL) AS user_emails
FROM public.workspaces w
LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id
LEFT JOIN auth.users au ON au.id = wm.user_id
LEFT JOIN public.user_roles ur ON ur.user_id = wm.user_id AND ur.role = 'system_admin'
WHERE w.id IN (
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
)
GROUP BY w.id, w.name, w.is_active
ORDER BY w.name;

REVOKE ALL ON public.workspace_isolation_audit FROM anon;
REVOKE ALL ON public.workspace_isolation_audit FROM authenticated;
GRANT SELECT ON public.workspace_isolation_audit TO authenticated;

COMMIT;

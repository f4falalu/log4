-- Migration: Convert safe SECURITY DEFINER views to SECURITY INVOKER
-- and add workspace isolation to pending_invitations_view
--
-- Views converted:
--   1. user_effective_permissions → SECURITY INVOKER (no auth.users join)
--   2. workspace_readiness_details → SECURITY INVOKER (no auth.users join)
--
-- Views kept SECURITY DEFINER but hardened:
--   3. pending_invitations_view → add workspace filter (needs DEFINER for profiles JOIN)

BEGIN;

-- ============================================================
-- 1. user_effective_permissions → SECURITY INVOKER
-- ============================================================
-- Does not join auth.users. Only joins RBAC tables which have
-- open RLS policies (RBAC suspended). Safe to convert.
DROP VIEW IF EXISTS public.user_effective_permissions CASCADE;

CREATE VIEW public.user_effective_permissions
WITH (security_invoker = true)
AS
SELECT DISTINCT
  ur.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  'role' AS source
FROM public.user_roles ur
JOIN public.role_permissions rp ON ur.role_id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id

UNION

SELECT DISTINCT
  ups.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  'permission_set' AS source
FROM public.user_permission_sets ups
JOIN public.permission_set_permissions psp ON ups.permission_set_id = psp.permission_set_id
JOIN public.permissions p ON psp.permission_id = p.id
WHERE ups.expires_at IS NULL OR ups.expires_at > now();

REVOKE ALL ON public.user_effective_permissions FROM anon;
GRANT SELECT ON public.user_effective_permissions TO authenticated;

-- ============================================================
-- 2. workspace_readiness_details → SECURITY INVOKER
-- ============================================================
-- Does not join auth.users or RLS-protected tables. Safe to convert.
-- Also add workspace filtering so users only see their own workspaces.
DROP VIEW IF EXISTS public.workspace_readiness_details CASCADE;

CREATE VIEW public.workspace_readiness_details
WITH (security_invoker = true)
AS
SELECT
  wr.workspace_id,
  w.name AS workspace_name,
  w.org_status,
  wr.has_admin,
  wr.has_rbac_configured,
  wr.has_warehouse,
  wr.has_vehicle,
  wr.has_packaging_rules,
  wr.is_ready,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT wr.has_admin THEN 'admin' END,
    CASE WHEN NOT wr.has_rbac_configured THEN 'rbac' END,
    CASE WHEN NOT wr.has_warehouse THEN 'warehouse' END,
    CASE WHEN NOT wr.has_vehicle THEN 'vehicle' END,
    CASE WHEN NOT wr.has_packaging_rules THEN 'packaging_rules' END
  ], NULL) AS missing_items,
  (
    (CASE WHEN wr.has_admin THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_rbac_configured THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_warehouse THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_vehicle THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_packaging_rules THEN 1 ELSE 0 END)
  ) * 20 AS progress_percentage,
  wr.admin_configured_at,
  wr.first_warehouse_at,
  wr.first_vehicle_at,
  wr.became_ready_at,
  wr.updated_at
FROM public.workspace_readiness wr
JOIN public.workspaces w ON w.id = wr.workspace_id;

REVOKE ALL ON public.workspace_readiness_details FROM anon;
GRANT SELECT ON public.workspace_readiness_details TO authenticated;

-- ============================================================
-- 3. pending_invitations_view → keep SECURITY DEFINER, add
--    workspace isolation
-- ============================================================
-- Must stay SECURITY DEFINER because it LEFT JOINs profiles
-- (which has RLS). Add workspace filter so users only see
-- invitations for their own workspaces.
DROP VIEW IF EXISTS public.pending_invitations_view CASCADE;

CREATE VIEW public.pending_invitations_view
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
  AND ui.expires_at > NOW()
  AND ui.workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid()
  );

REVOKE ALL ON public.pending_invitations_view FROM anon;
GRANT SELECT ON public.pending_invitations_view TO authenticated;

COMMIT;

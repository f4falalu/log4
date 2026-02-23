-- ============================================================================
-- Fix: Workspace isolation for integration RPC functions
-- ============================================================================
-- Problem: get_mod4_linked_users() and get_driver_devices() return data from
-- ALL workspaces, causing cross-organization data spillage.
-- Solution: Add workspace_id parameter and JOIN to workspace_members to scope
-- results to the caller's workspace.
-- ============================================================================

-- -------------------------------------------------------
-- 1. Replace get_mod4_linked_users with workspace-scoped version
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_mod4_linked_users();

CREATE OR REPLACE FUNCTION public.get_mod4_linked_users(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  driver_id UUID,
  status TEXT,
  link_method TEXT,
  linked_by UUID,
  linked_at TIMESTAMPTZ,
  user_email TEXT,
  user_name TEXT,
  linked_by_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    l.id,
    l.user_id,
    l.driver_id,
    l.status,
    l.link_method,
    l.linked_by,
    l.linked_at,
    u.email AS user_email,
    p.full_name AS user_name,
    lp.full_name AS linked_by_name
  FROM public.mod4_driver_links l
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.profiles lp ON lp.id = l.linked_by
  INNER JOIN public.workspace_members wm
    ON wm.user_id = l.user_id AND wm.workspace_id = p_workspace_id
  ORDER BY l.linked_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_mod4_linked_users(UUID) TO authenticated;

-- -------------------------------------------------------
-- 2. Replace get_driver_devices with workspace-scoped version
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_driver_devices();

CREATE OR REPLACE FUNCTION public.get_driver_devices(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  device_id TEXT,
  device_name TEXT,
  platform TEXT,
  is_trusted BOOLEAN,
  registered_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  user_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    d.id,
    d.user_id,
    d.device_id,
    d.device_name,
    d.platform,
    d.is_trusted,
    d.registered_at,
    d.last_seen_at,
    d.revoked_at,
    u.email AS user_email
  FROM public.driver_devices d
  JOIN auth.users u ON u.id = d.user_id
  INNER JOIN public.workspace_members wm
    ON wm.user_id = d.user_id AND wm.workspace_id = p_workspace_id
  ORDER BY d.last_seen_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_devices(UUID) TO authenticated;

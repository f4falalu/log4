-- ============================================================================
-- PHASE 1.2: RBAC v2 RPC FUNCTIONS
-- ============================================================================
-- Creates the three core RPCs that the frontend RBAC module will consume.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. get_my_workspaces()
-- ============================================================
-- Returns all workspaces the current user belongs to, including
-- their role code and role name in each workspace.

CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS TABLE(
  workspace_id UUID,
  name TEXT,
  slug TEXT,
  role_code TEXT,
  role_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    w.id AS workspace_id,
    w.name,
    w.slug,
    r.code AS role_code,
    r.name AS role_name
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  LEFT JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = auth.uid()
    AND w.is_active = true
  ORDER BY w.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_workspaces() TO authenticated;

-- ============================================================
-- 2. get_workspace_permissions(p_workspace_id)
-- ============================================================
-- Returns the permission codes the current user has in a specific
-- workspace. Combines role permissions + any per-user overrides
-- from member_permissions.

CREATE OR REPLACE FUNCTION public.get_workspace_permissions(p_workspace_id UUID)
RETURNS TABLE(permission_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Base permissions from role
  SELECT DISTINCT p.code AS permission_code
  FROM public.workspace_members wm
  JOIN public.role_permissions rp ON rp.role_id = wm.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id

  UNION

  -- Per-user granted overrides
  SELECT p.code AS permission_code
  FROM public.workspace_members wm
  JOIN public.member_permissions mp ON mp.workspace_member_id = wm.id
  JOIN public.permissions p ON p.id = mp.permission_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
    AND mp.granted = true

  EXCEPT

  -- Per-user revoked overrides
  SELECT p.code AS permission_code
  FROM public.workspace_members wm
  JOIN public.member_permissions mp ON mp.workspace_member_id = wm.id
  JOIN public.permissions p ON p.id = mp.permission_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
    AND mp.granted = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_permissions(UUID) TO authenticated;

-- ============================================================
-- 3. get_workspace_role(p_workspace_id)
-- ============================================================
-- Returns the role code for the current user in a specific workspace.

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.code
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_role(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- DONE: RBAC v2 RPCs created.
-- - get_my_workspaces() → workspace list with role info
-- - get_workspace_permissions(UUID) → permission codes for a workspace
-- - get_workspace_role(UUID) → role code for a workspace
-- ============================================================================

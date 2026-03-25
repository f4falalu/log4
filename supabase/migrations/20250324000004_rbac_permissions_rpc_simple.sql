-- RBAC Permissions RPC Functions (Simple - Works with existing schema)
-- These functions work with the existing roles and user_roles tables

-- Function to get user's workspaces with role information
CREATE OR REPLACE FUNCTION get_my_workspaces()
RETURNS TABLE (
  workspace_id uuid,
  name text,
  slug text,
  role_code text,
  role_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    w.id as workspace_id,
    w.name,
    w.slug,
    COALESCE(wm.role, 'member') as role_code,
    COALESCE(wm.role, 'Member') as role_name
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = auth.uid()
    AND w.is_active = true
  ORDER BY w.name;
$$;

-- Function to get user's role in a workspace
CREATE OR REPLACE FUNCTION get_workspace_role(
  p_workspace_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(wm.role, 'member')
  FROM workspace_members wm
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
  LIMIT 1;
$$;

-- Function to get user's workspace permissions (simplified)
CREATE OR REPLACE FUNCTION get_workspace_permissions(
  p_workspace_id uuid
)
RETURNS TABLE (
  permission_code text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get permissions from user's roles (using role codes directly)
  SELECT DISTINCT r.code as permission_code
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  
  UNION ALL
  
  -- Add workspace-specific permissions
  SELECT 
    CASE 
      WHEN wm.role = 'owner' THEN 'workspace.manage'
      WHEN wm.role = 'admin' THEN 'workspace.manage'
      WHEN wm.role = 'member' THEN 'workspace.read'
      ELSE 'workspace.read'
    END as permission_code
  FROM workspace_members wm
  WHERE wm.user_id = auth.uid()
    AND wm.workspace_id = p_workspace_id
  
  ORDER BY permission_code;
$$;

-- Function to get user's effective permissions with source information
CREATE OR REPLACE FUNCTION get_effective_permissions(
  p_user_id uuid,
  p_workspace_id uuid
)
RETURNS TABLE (
  permission_code text,
  module text,
  description text,
  granted boolean,
  source text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get permissions from user's roles (using role codes directly)
  SELECT 
    r.code as permission_code,
    'global' as module,
    'Global role: ' || r.name as description,
    true as granted,
    'role' as source
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
  
  UNION ALL
  
  -- Get workspace-specific permissions
  SELECT 
    CASE 
      WHEN wm.role = 'owner' THEN 'workspace.manage'
      WHEN wm.role = 'admin' THEN 'workspace.manage'
      WHEN wm.role = 'member' THEN 'workspace.read'
      ELSE 'workspace.read'
    END as permission_code,
    'workspace' as module,
    CASE 
      WHEN wm.role = 'owner' THEN 'Full workspace ownership'
      WHEN wm.role = 'admin' THEN 'Workspace administration'
      WHEN wm.role = 'member' THEN 'Workspace access'
      ELSE 'Basic workspace access'
    END as description,
    true as granted,
    'workspace_role' as source
  FROM workspace_members wm
  WHERE wm.user_id = p_user_id
    AND wm.workspace_id = p_workspace_id
    
  ORDER BY module, permission_code;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_my_workspaces TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_permissions TO authenticated;

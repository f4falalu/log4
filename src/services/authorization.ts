import { supabase } from '@/integrations/supabase/client';
import type { Permission } from '@/rbac/types';

/**
 * Get user permissions for a specific workspace
 * This service handles the core permission fetching logic
 */
export async function getUserPermissions(workspaceId: string): Promise<Permission[]> {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }

  try {
    const { data, error } = await supabase.rpc('get_workspace_permissions', {
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.error('Failed to fetch user permissions:', error);
      throw error;
    }

    // Transform the data to match Permission type
    const permissions = ((data as { permission_code: string }[]) || []).map(
      (row) => row.permission_code as Permission
    );

    return permissions;
  } catch (err) {
    console.error('Error in getUserPermissions:', err);
    throw err;
  }
}

/**
 * Get effective permissions with source information (role vs override)
 * This is used by the Permission Inspector
 */
export async function getEffectivePermissions(userId: string, workspaceId: string) {
  if (!userId || !workspaceId) {
    throw new Error('User ID and Workspace ID are required');
  }

  try {
    const { data, error } = await supabase.rpc('get_effective_permissions', {
      p_user_id: userId,
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.error('Failed to fetch effective permissions:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error in getEffectivePermissions:', err);
    throw err;
  }
}

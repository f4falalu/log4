import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  organization_id: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: {
    id: string;
    code: string;
    resource: string;
    action: string;
    category: string;
    description: string;
    is_dangerous: boolean;
  }[];
}

/**
 * Get all available roles
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Role[];
    },
  });
}

/**
 * Get a specific role with its permissions
 */
export function useRole(roleId: string | undefined) {
  return useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      if (!roleId) return null;

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      // Get permissions for this role
      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            id,
            code,
            resource,
            action,
            category,
            description,
            is_dangerous
          )
        `)
        .eq('role_id', roleId);

      if (permError) throw permError;

      return {
        ...role,
        permissions: permissions.map((p: any) => p.permissions),
      } as RoleWithPermissions;
    },
    enabled: !!roleId,
  });
}

/**
 * Get current user's roles
 */
export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_user_roles', {
        _user_id: user.id,
      });

      if (error) throw error;

      return data as { role_code: string; role_name: string }[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Check if user has a specific role
 */
export function useHasRole(roleCode: string): boolean {
  const { data: roles = [] } = useUserRoles();
  return roles.some((r) => r.role_code === roleCode);
}

/**
 * Check if user is system admin
 */
export function useIsSystemAdmin(): boolean {
  return useHasRole('system_admin');
}

/**
 * Assign role to user (admin only)
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate user permissions cache
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
    },
  });
}

/**
 * Remove role from user (admin only)
 */
export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
    },
  });
}

/**
 * Create a new role (admin only)
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (role: {
      name: string;
      code: string;
      description?: string;
      organization_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('roles')
        .insert(role)
        .select()
        .single();

      if (error) throw error;
      return data as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

/**
 * Update role permissions (admin only)
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => {
      // Delete existing permissions
      await supabase.from('role_permissions').delete().eq('role_id', roleId);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });

      // Refresh materialized view
      supabase.rpc('refresh_user_permissions');
    },
  });
}

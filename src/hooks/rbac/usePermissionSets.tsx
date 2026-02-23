import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PermissionSet {
  id: string;
  name: string;
  code: string;
  description: string | null;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionSetWithPermissions extends PermissionSet {
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

export interface UserPermissionSet {
  id: string;
  user_id: string;
  permission_set_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  permission_set: PermissionSet;
}

/**
 * Get all permission sets
 */
export function usePermissionSets() {
  return useQuery({
    queryKey: ['permission-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_sets')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as PermissionSet[];
    },
  });
}

/**
 * Get a specific permission set with its permissions
 */
export function usePermissionSet(permissionSetId: string | undefined) {
  return useQuery({
    queryKey: ['permission-set', permissionSetId],
    queryFn: async () => {
      if (!permissionSetId) return null;

      const { data: permissionSet, error: psError } = await supabase
        .from('permission_sets')
        .select('*')
        .eq('id', permissionSetId)
        .single();

      if (psError) throw psError;

      // Get permissions for this permission set
      const { data: permissions, error: permError } = await supabase
        .from('permission_set_permissions')
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
        .eq('permission_set_id', permissionSetId);

      if (permError) throw permError;

      return {
        ...permissionSet,
        permissions: permissions.map((p: any) => p.permissions),
      } as PermissionSetWithPermissions;
    },
    enabled: !!permissionSetId,
  });
}

/**
 * Get current user's permission sets
 */
export function useUserPermissionSets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permission-sets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_user_permission_sets', {
        _user_id: user.id,
      });

      if (error) throw error;

      return data as {
        permission_set_code: string;
        permission_set_name: string;
        expires_at: string | null;
      }[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Assign permission set to user (admin only)
 */
export function useAssignPermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionSetId,
      expiresAt,
    }: {
      userId: string;
      permissionSetId: string;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_permission_sets')
        .insert({
          user_id: userId,
          permission_set_id: permissionSetId,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-sets', variables.userId] });
    },
  });
}

/**
 * Remove permission set from user (admin only)
 */
export function useRemovePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionSetId,
    }: {
      userId: string;
      permissionSetId: string;
    }) => {
      const { error } = await supabase
        .from('user_permission_sets')
        .delete()
        .eq('user_id', userId)
        .eq('permission_set_id', permissionSetId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-sets', variables.userId] });
    },
  });
}

/**
 * Create a new permission set (admin only)
 */
export function useCreatePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionSet: {
      name: string;
      code: string;
      description?: string;
      organization_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('permission_sets')
        .insert(permissionSet)
        .select()
        .single();

      if (error) throw error;
      return data as PermissionSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-sets'] });
    },
  });
}

/**
 * Update permission set permissions (admin only)
 */
export function useUpdatePermissionSetPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      permissionSetId,
      permissionIds,
    }: {
      permissionSetId: string;
      permissionIds: string[];
    }) => {
      // Delete existing permissions
      await supabase
        .from('permission_set_permissions')
        .delete()
        .eq('permission_set_id', permissionSetId);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase.from('permission_set_permissions').insert(
          permissionIds.map((permissionId) => ({
            permission_set_id: permissionSetId,
            permission_id: permissionId,
          }))
        );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permission-set', variables.permissionSetId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });

      // Refresh materialized view
      supabase.rpc('refresh_user_permissions');
    },
  });
}

/**
 * Deactivate permission set (admin only)
 */
export function useDeactivatePermissionSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionSetId: string) => {
      const { error } = await supabase
        .from('permission_sets')
        .update({ is_active: false })
        .eq('id', permissionSetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-sets'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    },
  });
}

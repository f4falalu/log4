import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EffectivePermission {
  permission_id: string;
  permission_code: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  is_dangerous: boolean;
  source: 'role' | 'group' | 'direct' | 'permission_set';
  source_name: string;
}

/**
 * Get direct (non-role, non-group) permissions assigned to a user
 */
export function useUserDirectPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-direct-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          id,
          permission_id,
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
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        permission_id: d.permission_id,
        ...d.permissions,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Get all effective permissions for a user with source info
 */
export function useUserEffectivePermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-effective-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc(
        'admin_get_user_effective_permissions' as any,
        { _target_user_id: userId }
      );

      if (error) throw error;
      return (data as any[]) as EffectivePermission[];
    },
    enabled: !!userId,
  });
}

/**
 * Toggle a single permission for a user (direct grant/revoke)
 */
export function useSetUserPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionId,
      grant,
    }: {
      userId: string;
      permissionId: string;
      grant: boolean;
    }) => {
      const { error } = await supabase.rpc('admin_set_user_permission' as any, {
        _target_user_id: userId,
        _permission_id: permissionId,
        _grant: grant,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-direct-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
    },
  });
}

/**
 * Bulk replace all direct permissions for a user
 */
export function useBulkSetUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionIds,
    }: {
      userId: string;
      permissionIds: string[];
    }) => {
      const { error } = await supabase.rpc('admin_bulk_set_user_permissions' as any, {
        _target_user_id: userId,
        _permission_ids: permissionIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-direct-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
    },
  });
}

/**
 * Copy permissions from one user to another
 */
export function useCopyPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceUserId,
      targetUserId,
      copyDirect = true,
      copyRole = false,
      copyGroups = false,
    }: {
      sourceUserId: string;
      targetUserId: string;
      copyDirect?: boolean;
      copyRole?: boolean;
      copyGroups?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('admin_copy_user_permissions' as any, {
        _source_user_id: sourceUserId,
        _target_user_id: targetUserId,
        _copy_direct: copyDirect,
        _copy_role: copyRole,
        _copy_groups: copyGroups,
      });

      if (error) throw error;
      return data as {
        direct_permissions_copied: number;
        role_copied: string | null;
        groups_copied: number;
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-direct-permissions', variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.targetUserId] });
    },
  });
}

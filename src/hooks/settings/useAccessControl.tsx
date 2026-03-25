import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EffectivePermission {
  permission_id: string;
  permission_code: string;
  category: string;
  description: string;
  granted: boolean;
  source: 'role' | 'override' | 'none';
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function useMemberEffectivePermissions(
  workspaceId: string | null,
  memberUserId: string | null
) {
  return useQuery({
    queryKey: ['member-effective-permissions', workspaceId, memberUserId],
    queryFn: async () => {
      if (!workspaceId || !memberUserId) return [];

      const { data, error } = await supabase.rpc('get_effective_permissions', {
        p_user_id: memberUserId,
        p_workspace_id: workspaceId,
      });

      if (error) throw error;

      return (data || []).map((row: any): EffectivePermission => ({
        permission_id: row.permission_id,
        permission_code: row.permission_code,
        category: row.category,
        description: row.description,
        granted: row.granted,
        source: row.source as 'role' | 'override' | 'none',
      }));
    },
    enabled: !!workspaceId && !!memberUserId,
    staleTime: 10000,
  });
}

export function useSaveMemberOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      memberUserId,
      grantIds,
    }: {
      workspaceId: string;
      memberUserId: string;
      grantIds: string[];
    }) => {
      const { error } = await supabase.rpc('save_member_overrides', {
        p_workspace_id: workspaceId,
        p_member_user_id: memberUserId,
        p_grant_ids: grantIds,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Permission overrides saved');
      queryClient.invalidateQueries({
        queryKey: ['member-effective-permissions', variables.workspaceId, variables.memberUserId],
      });
    },
    onError: (error) => {
      console.error('Failed to save overrides:', error);
      toast.error('Failed to save permission overrides');
    },
  });
}

export function useResetMemberOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      memberUserId,
    }: {
      workspaceId: string;
      memberUserId: string;
    }) => {
      const { error } = await supabase.rpc('reset_member_overrides', {
        p_workspace_id: workspaceId,
        p_member_user_id: memberUserId,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Permissions reset to role defaults');
      queryClient.invalidateQueries({
        queryKey: ['member-effective-permissions', variables.workspaceId, variables.memberUserId],
      });
    },
    onError: (error) => {
      console.error('Failed to reset overrides:', error);
      toast.error('Failed to reset permissions');
    },
  });
}

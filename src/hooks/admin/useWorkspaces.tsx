import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  country_id: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  profile: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*, workspace_members(count)')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map((ws: any) => ({
        ...ws,
        member_count: ws.workspace_members?.[0]?.count || 0,
      })) as Workspace[];
    },
    staleTime: 30000,
  });
}

export function useWorkspaceDetail(workspaceId: string) {
  return useQuery({
    queryKey: ['admin-workspace', workspaceId],
    queryFn: async () => {
      // Fetch workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (wsError) throw wsError;

      // Fetch members with profiles
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          workspace_id,
          role,
          joined_at,
          profiles (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      return {
        workspace: workspace as Workspace,
        members: (members || []).map((m: any) => ({
          ...m,
          profile: m.profiles,
        })) as WorkspaceMember[],
      };
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      description,
      is_active,
    }: {
      workspaceId: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Workspace updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    },
    onError: (error) => {
      console.error('Failed to update workspace:', error);
      toast.error('Failed to update workspace. Please try again.');
    },
  });
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Member added successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-workspace', variables.workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member. Please try again.');
    },
  });
}

export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Member role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-workspace', variables.workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to update member:', error);
      toast.error('Failed to update member. Please try again.');
    },
  });
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
    }: {
      workspaceId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['admin-workspace', variables.workspaceId] });
    },
    onError: (error) => {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member. Please try again.');
    },
  });
}

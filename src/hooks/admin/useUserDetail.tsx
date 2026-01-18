import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user email from auth.users
      const { data: authData, error: authError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (authError) throw authError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, assigned_by, assigned_at')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Fetch workspaces
      const { data: workspaces, error: workspacesError } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', userId);

      if (workspacesError) throw workspacesError;

      return {
        profile,
        roles: roles || [],
        workspaces: workspaces || [],
      };
    },
    enabled: !!userId,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.rpc('assign_user_role', {
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Role assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role. Please try again.');
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.rpc('remove_user_role', {
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Role removed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role. Please try again.');
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      full_name,
      phone,
    }: {
      userId: string;
      full_name: string;
      phone?: string;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name, phone })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    },
  });
}

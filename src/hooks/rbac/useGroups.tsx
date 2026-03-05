import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupWithDetails extends UserGroup {
  member_count: number;
  permission_count: number;
}

export interface GroupMember {
  id: string;
  user_id: string;
  added_at: string;
  full_name: string | null;
  email: string | null;
}

/**
 * Get all user groups
 */
export function useGroups() {
  return useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get member and permission counts
      const groupIds = (groups || []).map((g: any) => g.id);

      if (groupIds.length === 0) return [] as GroupWithDetails[];

      const [{ data: memberCounts }, { data: permCounts }] = await Promise.all([
        supabase
          .from('group_members')
          .select('group_id')
          .in('group_id', groupIds),
        supabase
          .from('group_permissions')
          .select('group_id')
          .in('group_id', groupIds),
      ]);

      const memberCountMap: Record<string, number> = {};
      const permCountMap: Record<string, number> = {};

      (memberCounts || []).forEach((m: any) => {
        memberCountMap[m.group_id] = (memberCountMap[m.group_id] || 0) + 1;
      });
      (permCounts || []).forEach((p: any) => {
        permCountMap[p.group_id] = (permCountMap[p.group_id] || 0) + 1;
      });

      return (groups || []).map((g: any) => ({
        ...g,
        member_count: memberCountMap[g.id] || 0,
        permission_count: permCountMap[g.id] || 0,
      })) as GroupWithDetails[];
    },
  });
}

/**
 * Get a specific group with its members and permissions
 */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['user-group', groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data: group, error: groupError } = await supabase
        .from('user_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Get members with profiles
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('id, user_id, added_at')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Get profiles for members
      const userIds = (members || []).map((m: any) => m.user_id);
      let profiles: Record<string, { full_name: string | null; email: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        (profileData || []).forEach((p: any) => {
          profiles[p.id] = { full_name: p.full_name, email: null };
        });
      }

      // Get permissions
      const { data: permissions, error: permError } = await supabase
        .from('group_permissions')
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
        .eq('group_id', groupId);

      if (permError) throw permError;

      return {
        ...group,
        members: (members || []).map((m: any) => ({
          ...m,
          full_name: profiles[m.user_id]?.full_name || null,
          email: profiles[m.user_id]?.email || null,
        })) as GroupMember[],
        permissions: (permissions || []).map((p: any) => p.permissions),
        permission_ids: (permissions || []).map((p: any) => p.permission_id) as string[],
      };
    },
    enabled: !!groupId,
  });
}

/**
 * Get groups a specific user belongs to
 */
export function useUserGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-group-memberships', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          added_at,
          user_groups (
            id,
            name,
            code,
            description
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        membership_id: d.id,
        group_id: d.group_id,
        added_at: d.added_at,
        ...d.user_groups,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Create a new group
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (group: {
      name: string;
      code: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_groups')
        .insert(group)
        .select()
        .single();

      if (error) throw error;
      return data as UserGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });
}

/**
 * Delete a group
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });
}

/**
 * Add a user to a group
 */
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-group-memberships', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.userId] });
    },
  });
}

/**
 * Remove a user from a group
 */
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      groupId,
      userId,
    }: {
      membershipId: string;
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-group-memberships', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', variables.userId] });
    },
  });
}

/**
 * Update group permissions (bulk replace)
 */
export function useUpdateGroupPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      permissionIds,
    }: {
      groupId: string;
      permissionIds: string[];
    }) => {
      const { error } = await supabase.rpc('admin_set_group_permissions' as any, {
        _group_id: groupId,
        _permission_ids: permissionIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
    },
  });
}

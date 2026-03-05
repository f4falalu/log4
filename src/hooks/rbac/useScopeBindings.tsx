import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';

type ScopeType = Database['public']['Enums']['scope_type'];

export interface ScopeBinding {
  id: string;
  user_id: string;
  scope_type: ScopeType;
  scope_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface ScopeBindingDetailed extends ScopeBinding {
  user_email: string | null;
  user_name: string | null;
  scope_name: string | null;
}

export function useUserScopeBindings(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-scope-bindings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('user_scopes_detailed')
        .select('*')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as ScopeBindingDetailed[];
    },
    enabled: !!userId,
  });
}

export function useAssignScopeBinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      scopeType,
      scopeId,
    }: {
      userId: string;
      scopeType: ScopeType;
      scopeId: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session?.session?.user?.id;

      const { data, error } = await supabase
        .from('user_scope_bindings')
        .insert({
          user_id: userId,
          scope_type: scopeType,
          scope_id: scopeId,
          assigned_by: currentUserId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ScopeBinding;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-scope-bindings', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-scopes-summary'] });
    },
  });
}

export function useRemoveScopeBinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bindingId, userId }: { bindingId: string; userId: string }) => {
      const { error } = await supabase.from('user_scope_bindings').delete().eq('id', bindingId);

      if (error) throw error;
      return { bindingId, userId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-scope-bindings', result.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-scopes-summary'] });
    },
  });
}

// Helper hook to fetch warehouse options for scope binding
export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses-for-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper hook to fetch program options for scope binding
export function usePrograms() {
  return useQuery({
    queryKey: ['programs-for-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Helper hook to fetch facility options for scope binding
export function useFacilities() {
  return useQuery({
    queryKey: ['facilities-for-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, warehouse_code')
        .is('deleted_at', null)
        .order('name')
        .limit(500);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Helper hook to fetch admin unit (zone) options for scope binding
export function useAdminUnits() {
  return useQuery({
    queryKey: ['admin-units-for-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_units')
        .select('id, name, admin_level')
        .eq('is_active', true)
        .order('admin_level')
        .order('name')
        .limit(500);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  roles: string[];
  workspace_count: number;
  created_at: string;
}

interface UseUsersParams {
  search?: string;
  roleFilter?: string[];
  limit?: number;
  offset?: number;
}

export function useUsers(params: UseUsersParams = {}) {
  const { search = null, roleFilter = null, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: ['admin-users', search, roleFilter, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_roles', {
        p_search: search,
        p_role_filter: roleFilter,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return data as User[];
    },
    retry: 1,
    refetchInterval: 30000,
  });
}

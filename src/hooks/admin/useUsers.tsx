import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  organization: string;
  roles: string[];
  workspace_count: number;
  user_metadata: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    organization?: string;
  };
  app_metadata: {
    roles?: string[];
    workspace_count?: number;
    organization?: string;
  };
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
      try {
        // Call RPC instead of querying admin_users_view (dropped for security)
        const { data, error } = await supabase.rpc('get_admin_users', {
          p_search: search || null,
          p_role_filter: roleFilter && roleFilter.length > 0 ? roleFilter : null,
          p_limit: limit,
          p_offset: offset,
        });

        if (error) {
          throw error;
        }

        const result = data as { users: any[]; total: number };

        // Transform data to match User interface
        const users: User[] = (result.users || []).map((user: any) => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email?.split('@')[0] || '',
          phone: user.phone || user.user_metadata?.phone || null,
          avatar_url: user.avatar_url || user.user_metadata?.avatar_url || null,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          organization: user.organization || 'default',
          roles: user.roles || [],
          workspace_count: user.workspace_count || 1,
          user_metadata: {
            ...user.user_metadata,
            organization: user.organization || 'default',
          },
          app_metadata: {
            ...user.app_metadata,
            roles: user.roles || [],
            workspace_count: user.workspace_count || 1,
            organization: user.organization || 'default',
          },
        }));

        return {
          users,
          total: result.total || 0,
        };
      } catch (error) {
        console.error('Error in useUsers query:', error);
        // Return fallback data
        return {
          users: [],
          total: 0,
        };
      }
    },
    retry: 1,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

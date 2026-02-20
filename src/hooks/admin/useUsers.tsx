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
  user_metadata: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  };
  app_metadata: {
    roles?: string[];
    workspace_count?: number;
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
      let query = supabase
        .from('auth.users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          user_metadata,
          app_metadata,
          phone
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter
      if (search) {
        query = query.or(`email.ilike.%${search}%,user_metadata->>full_name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to match User interface
      const users: User[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        phone: user.phone || user.user_metadata?.phone || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {},
      }));

      return {
        users,
        total: count || 0,
      };
    },
    retry: 1,
    refetchInterval: 30000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { useEffect } from 'react';

export function useUserRole() {
  const { user, activeRole, setActiveRole } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Use SECURITY DEFINER RPC to bypass RLS issues on user_roles/roles tables
      const { data, error } = await supabase.rpc('get_my_roles' as any);

      if (error) {
        console.error('[useUserRole] get_my_roles RPC failed:', error);
        throw error;
      }

      return ((data as string[]) || []).filter(Boolean) as AppRole[];
    },
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Set default active role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !activeRole) {
      // Default to system_admin if available, otherwise first role
      const defaultRole = roles.includes('system_admin') ? 'system_admin' : roles[0];
      setActiveRole(defaultRole);
    }
  }, [roles, activeRole, setActiveRole]);

  const hasRole = (role: AppRole) => roles.includes(role);

  const switchRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRole(role);
    }
  };

  const isAdmin = hasRole('system_admin');
  const isWarehouseOfficer = hasRole('warehouse_officer');
  const isDriver = hasRole('driver');
  const isZonalManager = hasRole('zonal_manager');
  const isViewer = hasRole('viewer');

  return {
    roles,
    activeRole,
    switchRole,
    hasRole,
    isAdmin,
    isWarehouseOfficer,
    isDriver,
    isZonalManager,
    isViewer,
    isLoading,
  };
}

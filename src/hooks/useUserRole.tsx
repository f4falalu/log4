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

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(r => r.role) as AppRole[];
    },
    enabled: !!user,
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

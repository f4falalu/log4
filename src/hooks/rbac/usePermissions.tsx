import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Permission {
  permission_code: string;
  source: 'role' | 'permission_set';
  resource: string;
  action: string;
  category: string;
  is_dangerous: boolean;
}

/**
 * Get all effective permissions for the current user
 * Combines permissions from roles + permission sets
 */
export function usePermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
      });

      if (error) throw error;

      return data as Permission[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if current user has a specific permission
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: permissions = [] } = usePermissions();
  return permissions.some((p) => p.permission_code === permissionCode);
}

/**
 * Check if current user has ALL of the specified permissions
 */
export function useHasAllPermissions(permissionCodes: string[]): boolean {
  const { data: permissions = [] } = usePermissions();
  const userPermissionCodes = new Set(permissions.map((p) => p.permission_code));

  return permissionCodes.every((code) => userPermissionCodes.has(code));
}

/**
 * Check if current user has ANY of the specified permissions
 */
export function useHasAnyPermission(permissionCodes: string[]): boolean {
  const { data: permissions = [] } = usePermissions();
  const userPermissionCodes = new Set(permissions.map((p) => p.permission_code));

  return permissionCodes.some((code) => userPermissionCodes.has(code));
}

/**
 * Check permission with resource context (e.g., warehouse, program)
 * This is a client-side check - server must also validate
 */
export function useCanAccessResource(
  permissionCode: string,
  resourceContext?: {
    warehouse_id?: string;
    program_id?: string;
    zone_id?: string;
    facility_id?: string;
  }
) {
  const { user } = useAuth();
  const hasPermission = useHasPermission(permissionCode);

  // Note: Scope checking should be done server-side
  // This is just a UI helper
  // TODO: Could call can_access_resource() RPC for full validation

  return {
    hasPermission,
    canAccess: hasPermission, // Simplified - add scope logic later
  };
}

/**
 * Get permissions grouped by category
 */
export function usePermissionsByCategory() {
  const { data: permissions = [] } = usePermissions();

  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return grouped;
}

/**
 * Check if user has dangerous permissions
 */
export function useHasDangerousPermissions(): boolean {
  const { data: permissions = [] } = usePermissions();
  return permissions.some((p) => p.is_dangerous);
}

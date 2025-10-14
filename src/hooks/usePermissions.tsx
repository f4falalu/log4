import { useUserRole } from './useUserRole';

export type Permission = 
  | 'view_batches'
  | 'create_batches'
  | 'update_batches'
  | 'delete_batches'
  | 'assign_drivers'
  | 'manage_drivers'
  | 'manage_vehicles'
  | 'manage_facilities'
  | 'view_reports'
  | 'manage_users'
  | 'view_analytics'
  | 'view_tactical_map';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  system_admin: [
    'view_batches', 'create_batches', 'update_batches', 'delete_batches',
    'assign_drivers', 'manage_drivers', 'manage_vehicles', 'manage_facilities',
    'view_reports', 'manage_users', 'view_analytics', 'view_tactical_map'
  ],
  warehouse_officer: [
    'view_batches', 'create_batches', 'update_batches',
    'assign_drivers', 'manage_facilities', 'view_reports', 'view_analytics', 'view_tactical_map'
  ],
  dispatcher: [
    'view_batches', 'update_batches', 'assign_drivers', 'view_reports', 'view_tactical_map'
  ],
  driver: [
    'view_batches'
  ],
  viewer: [
    'view_batches', 'view_reports'
  ]
};

export function usePermissions() {
  const { roles, activeRole, isAdmin } = useUserRole();

  const hasPermission = (permission: Permission): boolean => {
    if (!activeRole) return false;
    const permissions = ROLE_PERMISSIONS[activeRole] || [];
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roles,
    activeRole,
    isAdmin
  };
}

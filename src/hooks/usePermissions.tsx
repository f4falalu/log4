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

/**
 * Temporary permissive hook during RBAC v2 transition.
 * All authenticated users get full access.
 * Will be replaced by useAbility() in Phase 4.
 */
export function usePermissions() {
  const hasPermission = (_permission: Permission): boolean => true;
  const hasAnyPermission = (_permissions: Permission[]): boolean => true;
  const hasAllPermissions = (_permissions: Permission[]): boolean => true;

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

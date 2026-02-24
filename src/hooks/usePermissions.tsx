import { useUserRole } from './useUserRole';
import { usePermissions as useRbacPermissions } from './rbac/usePermissions';

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
 * Maps legacy permission names to new RBAC permission codes.
 * The RBAC system uses `resource.action` format (e.g., 'batch.create').
 */
const LEGACY_TO_RBAC: Record<Permission, string[]> = {
  view_batches: ['batch.create', 'batch.assign', 'driver.view_assigned', 'report.view'],
  create_batches: ['batch.create'],
  update_batches: ['batch.assign', 'batch.dispatch'],
  delete_batches: ['batch.cancel'],
  assign_drivers: ['batch.assign'],
  manage_drivers: ['batch.assign'],
  manage_vehicles: ['warehouse.manage'],
  manage_facilities: ['facility.manage'],
  view_reports: ['report.view'],
  manage_users: ['system.manage_users'],
  view_analytics: ['report.view'],
  view_tactical_map: ['report.view'],
};

/**
 * Backwards-compatible permission hook.
 * Delegates to the new RBAC system via get_user_permissions RPC.
 * Falls back to role-based logic if RBAC data is not yet loaded.
 */
export function usePermissions() {
  const { roles, activeRole, isAdmin } = useUserRole();
  const { data: rbacPermissions = [] } = useRbacPermissions();

  const rbacCodes = new Set(rbacPermissions.map((p) => p.permission_code));

  const hasPermission = (permission: Permission): boolean => {
    // System admin always has all permissions
    if (isAdmin) return true;

    // Check via new RBAC system
    if (rbacPermissions.length > 0) {
      const rbacCodesToCheck = LEGACY_TO_RBAC[permission] || [];
      return rbacCodesToCheck.some((code) => rbacCodes.has(code));
    }

    // Fallback: no RBAC data yet — deny by default (data is loading)
    return false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roles,
    activeRole,
    isAdmin,
  };
}

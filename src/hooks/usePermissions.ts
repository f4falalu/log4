import { useUserRole } from './useUserRole';
import { hasPermission, isAdmin as checkIsAdmin, canManageBatches, canManageFleet, canViewReports, Permission, AppRole } from '@/lib/permissions';

/**
 * Hook for checking user permissions in UI components
 *
 * Usage:
 * const { hasPermission, canCreate, canUpdate, isAdmin } = usePermissions();
 *
 * if (hasPermission('manage_users')) {
 *   // Show admin panel
 * }
 */
export function usePermissions() {
  const { activeRole, roles, isLoading } = useUserRole();

  /**
   * Check if user has a specific permission
   */
  const checkPermission = (permission: Permission): boolean => {
    if (!activeRole) return false;
    return hasPermission(activeRole, permission);
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!activeRole) return false;
    return permissions.some(permission => hasPermission(activeRole, permission));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!activeRole) return false;
    return permissions.every(permission => hasPermission(activeRole, permission));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  return {
    // Core permission checking
    hasPermission: checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,

    // Specific permission checks
    canViewBatches: checkPermission('view_batches'),
    canCreateBatches: checkPermission('create_batches'),
    canUpdateBatches: checkPermission('update_batches'),
    canDeleteBatches: checkPermission('delete_batches'),
    canAssignDrivers: checkPermission('assign_drivers'),
    canManageDrivers: checkPermission('manage_drivers'),
    canManageVehicles: checkPermission('manage_vehicles'),
    canManageFacilities: checkPermission('manage_facilities'),
    canViewReports: checkPermission('view_reports'),
    canManageUsers: checkPermission('manage_users'),
    canViewAnalytics: checkPermission('view_analytics'),
    canViewTacticalMap: checkPermission('view_tactical_map'),

    // Composite permission helpers
    canManageBatches: canManageBatches(activeRole),
    canManageFleet: canManageFleet(activeRole),

    // Role checks
    isAdmin: checkIsAdmin(activeRole),
    isWarehouseOfficer: hasRole('warehouse_officer'),
    isDispatcher: hasRole('dispatcher'),
    isDriver: hasRole('driver'),
    isViewer: hasRole('viewer'),

    // Current state
    activeRole,
    roles,
    isLoading,
  };
}

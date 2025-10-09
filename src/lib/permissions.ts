export type AppRole = 'system_admin' | 'warehouse_officer' | 'dispatcher' | 'driver' | 'viewer';

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
  | 'view_analytics';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  system_admin: [
    'view_batches', 'create_batches', 'update_batches', 'delete_batches',
    'assign_drivers', 'manage_drivers', 'manage_vehicles', 'manage_facilities',
    'view_reports', 'manage_users', 'view_analytics'
  ],
  warehouse_officer: [
    'view_batches', 'create_batches', 'update_batches',
    'assign_drivers', 'manage_facilities', 'view_reports', 'view_analytics'
  ],
  dispatcher: [
    'view_batches', 'update_batches', 'assign_drivers', 'view_reports'
  ],
  driver: [
    'view_batches'
  ],
  viewer: [
    'view_batches', 'view_reports'
  ]
};

export function hasPermission(role: AppRole | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function canManageBatches(role: AppRole | null): boolean {
  return hasPermission(role, 'create_batches') || hasPermission(role, 'update_batches');
}

export function canManageFleet(role: AppRole | null): boolean {
  return hasPermission(role, 'manage_drivers') || hasPermission(role, 'manage_vehicles');
}

export function canViewReports(role: AppRole | null): boolean {
  return hasPermission(role, 'view_reports');
}

export function isAdmin(role: AppRole | null): boolean {
  return role === 'system_admin';
}

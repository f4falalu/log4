import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  /**
   * Required permission(s)
   * - Single permission: 'manage_users'
   * - Multiple permissions (ANY): ['create_batches', 'update_batches']
   */
  permission?: Permission | Permission[];
  /**
   * Require ALL permissions instead of ANY (default: false)
   */
  requireAll?: boolean;
  /**
   * Custom fallback content when permission denied
   */
  fallback?: ReactNode;
  /**
   * Show nothing instead of error message when denied (default: false)
   */
  hideOnDenied?: boolean;
}

/**
 * Component guard that only renders children if user has required permission(s)
 *
 * Usage:
 * <PermissionGuard permission="manage_users">
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * <PermissionGuard permission={['create_batches', 'update_batches']}>
 *   <BatchEditor />
 * </PermissionGuard>
 *
 * <PermissionGuard permission={['manage_drivers', 'assign_drivers']} requireAll>
 *   <DriverAssignment />
 * </PermissionGuard>
 *
 * <PermissionGuard permission="manage_users" hideOnDenied>
 *   <Button>Admin Action</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  requireAll = false,
  fallback,
  hideOnDenied = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Loading state
  if (isLoading) {
    return null;
  }

  // Check permissions
  let hasAccess = false;

  if (!permission) {
    // No permission specified, allow access
    hasAccess = true;
  } else if (Array.isArray(permission)) {
    // Multiple permissions
    if (requireAll) {
      hasAccess = hasAllPermissions(permission);
    } else {
      hasAccess = hasAnyPermission(permission);
    }
  } else {
    // Single permission
    hasAccess = hasPermission(permission);
  }

  if (!hasAccess) {
    if (hideOnDenied) {
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this feature. Contact your administrator if you believe this is an error.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

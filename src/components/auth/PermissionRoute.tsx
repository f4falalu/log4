import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermissionRouteProps {
  children: ReactNode;
  /**
   * Required permission(s) to access this route
   */
  permission: Permission | Permission[];
  /**
   * Require ALL permissions instead of ANY (default: false)
   */
  requireAll?: boolean;
  /**
   * Redirect path when permission denied (default: show error page)
   */
  redirectTo?: string;
}

/**
 * Route wrapper that requires specific permissions
 *
 * Usage in App.tsx:
 * <Route path="/admin/users" element={
 *   <PermissionRoute permission="manage_users">
 *     <UserManagementPage />
 *   </PermissionRoute>
 * } />
 *
 * <Route path="/fleetops/dispatch" element={
 *   <PermissionRoute permission={['create_batches', 'assign_drivers']} requireAll>
 *     <DispatchPage />
 *   </PermissionRoute>
 * } />
 */
export function PermissionRoute({
  children,
  permission,
  requireAll = false,
  redirectTo,
}: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check permissions
  let hasAccess = false;

  if (Array.isArray(permission)) {
    if (requireAll) {
      hasAccess = hasAllPermissions(permission);
    } else {
      hasAccess = hasAnyPermission(permission);
    }
  } else {
    hasAccess = hasPermission(permission);
  }

  // Redirect or show error
  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Show permission denied page
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This area requires specific permissions that haven't been granted to your account.
              {' '}
              Contact your system administrator if you believe you should have access.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
              <Button onClick={() => window.location.href = '/fleetops'}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

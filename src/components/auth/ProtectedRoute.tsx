import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanAccessPlanning } from '@/hooks/useWorkspaceReadiness';
import { AppRole } from '@/types';
import { toast } from 'sonner';

/**
 * Routes that require full platform readiness (warehouse + vehicle)
 * before access is allowed.
 */
const PLANNING_ROUTES = [
  '/storefront/schedule-planner',
  '/storefront/scheduler',
  '/fleetops/dispatch',
  '/fleetops/batches',
];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiresReadiness?: boolean;
  workspaceId?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiresReadiness = false,
  workspaceId,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { hasRole, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  // Check if this is a planning route that requires readiness
  const isPlanningRoute = PLANNING_ROUTES.some((route) => location.pathname.startsWith(route));
  const shouldCheckReadiness = requiresReadiness || isPlanningRoute;

  // Get workspace ID from context or props
  // Note: In a real implementation, this would come from WorkspaceContext
  const effectiveWorkspaceId = workspaceId;

  // Only check readiness if needed and we have a workspace ID
  const { data: canAccessPlanning, isLoading: readinessLoading } = useCanAccessPlanning(
    shouldCheckReadiness ? effectiveWorkspaceId : null
  );

  // TEMPORARY: Auth bypass for development (remove before production)
  const AUTH_BYPASS = localStorage.getItem('biko_dev_access') === 'granted';

  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  // Combined loading state
  const isLoading = loading || roleLoading || (shouldCheckReadiness && readinessLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication - redirect mod4 (driver PWA) routes to /login
  if (!user) {
    const redirectTo = location.pathname.startsWith('/mod4') ? '/login' : '/auth';
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    toast.error(`Access denied: ${requiredRole} role required`);
    return <Navigate to="/fleetops" replace />;
  }

  // Check readiness for planning routes
  if (shouldCheckReadiness && effectiveWorkspaceId && canAccessPlanning === false) {
    toast.error('Complete workspace setup to access planning features');
    return <Navigate to="/onboarding/operational" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

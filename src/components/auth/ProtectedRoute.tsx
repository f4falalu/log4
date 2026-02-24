import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanAccessPlanning } from '@/hooks/useWorkspaceReadiness';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Check if user has a workspace (for onboarding redirect)
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isInviteRoute = location.pathname.startsWith('/invite');
  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-guard-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_onboarding_status');
      if (error) throw error;
      return data as {
        user_id: string;
        onboarding_completed: boolean;
        has_workspace: boolean;
        has_role: boolean;
      };
    },
    enabled: !!user && !isOnboardingRoute && !isInviteRoute,
    staleTime: 30000,
  });

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

  // Combined loading state
  const isLoading = loading || roleLoading || (shouldCheckReadiness && readinessLoading) || (!isOnboardingRoute && !isInviteRoute && onboardingLoading);

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

  // Check if user needs onboarding (no workspace yet)
  // Users with both a workspace and a role are existing users — skip onboarding
  // even if onboarding_completed hasn't been explicitly set (pre-V2 accounts)
  if (
    !isOnboardingRoute &&
    !isInviteRoute &&
    onboardingStatus &&
    !onboardingStatus.has_workspace &&
    !onboardingStatus.has_role &&
    !onboardingStatus.onboarding_completed
  ) {
    return <Navigate to="/onboarding" replace />;
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

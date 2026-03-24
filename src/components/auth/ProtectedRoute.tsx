import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAbility } from '@/rbac';
import { useCanAccessPlanning } from '@/hooks/useWorkspaceReadiness';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Permission } from '@/rbac/types';

/**
 * Routes that require full platform readiness (warehouse + vehicle)
 * before access is allowed.
 */
const PLANNING_ROUTES = [
  '/storefront/schedule-planner',
  '/storefront/scheduler',
  '/fleetops/batches',
];

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Permission required to access this route */
  permission?: Permission;
  /** @deprecated Legacy role check — ignored during v2 transition */
  requiredRole?: string;
  requiresReadiness?: boolean;
  workspaceId?: string;
}

export function ProtectedRoute({
  children,
  permission,
  requiredRole,
  requiresReadiness = false,
  workspaceId: workspaceIdProp,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { workspaceId: contextWorkspaceId } = useWorkspace();
  const effectiveWorkspaceId = workspaceIdProp || contextWorkspaceId;
  const { can, isLoading: abilityLoading } = useAbility({ workspaceId: effectiveWorkspaceId });
  const location = useLocation();

  // Check if user has a workspace (for onboarding redirect)
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isProfileCompletionRoute = location.pathname === '/onboarding/profile';
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
    enabled: !!user && !isOnboardingRoute && !isProfileCompletionRoute && !isInviteRoute,
    staleTime: 30000,
  });

  // Check if this is a planning route that requires readiness
  const isPlanningRoute = PLANNING_ROUTES.some((route) => location.pathname.startsWith(route));
  const shouldCheckReadiness = requiresReadiness || isPlanningRoute;

  // Only check readiness if needed and we have a workspace ID
  const { data: canAccessPlanning, isLoading: readinessLoading } = useCanAccessPlanning(
    shouldCheckReadiness ? effectiveWorkspaceId : null
  );

  // Combined loading state
  const isLoading =
    loading ||
    (shouldCheckReadiness && readinessLoading) ||
    (!isOnboardingRoute && !isProfileCompletionRoute && !isInviteRoute && onboardingLoading) ||
    (!!permission && abilityLoading);

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

  // Check authentication
  if (!user) {
    const redirectTo = location.pathname.startsWith('/mod4') ? '/login' : '/auth';
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user needs onboarding (no workspace yet)
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

  // Permission check via RBAC v2
  if (permission && !can(permission)) {
    return <Navigate to="/fleetops" replace />;
  }

  // Check readiness for planning routes
  if (shouldCheckReadiness && effectiveWorkspaceId && canAccessPlanning === false) {
    return <Navigate to="/onboarding/operational" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

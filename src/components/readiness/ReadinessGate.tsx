/**
 * Readiness Gate Component
 *
 * Blocks access to features until workspace is properly configured.
 * Used to enforce platform readiness requirements before allowing
 * access to planning and operational features.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspaceReadiness } from '@/hooks/useWorkspaceReadiness';
import { Loader2 } from 'lucide-react';
import type { ReadinessGate as ReadinessGateType } from '@/types/onboarding';
import { SetupRequiredPrompt } from './SetupRequiredPrompt';

interface ReadinessGateProps {
  children: ReactNode;
  workspaceId: string | null | undefined;
  requiredGates?: ReadinessGateType[];
  fallbackPath?: string;
  showPrompt?: boolean;
}

/**
 * ReadinessGate - Blocks access until workspace readiness requirements are met
 *
 * Usage:
 * ```tsx
 * <ReadinessGate workspaceId={workspaceId} requiredGates={['warehouse', 'vehicle']}>
 *   <PlanningFeature />
 * </ReadinessGate>
 * ```
 */
export function ReadinessGate({
  children,
  workspaceId,
  requiredGates,
  fallbackPath = '/onboarding/operational',
  showPrompt = true,
}: ReadinessGateProps) {
  const location = useLocation();
  const { data: readiness, isLoading, error } = useWorkspaceReadiness(workspaceId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no workspace ID, redirect to onboarding
  if (!workspaceId) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // Handle error state
  if (error) {
    console.error('Readiness check error:', error);
    // Allow access on error (fail open) but log the issue
    return <>{children}</>;
  }

  // Check if all required gates pass
  const gatesPass = requiredGates
    ? requiredGates.every((gate) => {
        if (!readiness) return false;
        switch (gate) {
          case 'admin':
            return readiness.has_admin;
          case 'rbac':
            return readiness.has_rbac_configured;
          case 'warehouse':
            return readiness.has_warehouse;
          case 'vehicle':
            return readiness.has_vehicle;
          case 'packaging_rules':
            return readiness.has_packaging_rules;
          default:
            return false;
        }
      })
    : readiness?.is_ready ?? false;

  // If gates don't pass, show prompt or redirect
  if (!gatesPass) {
    if (showPrompt) {
      return <SetupRequiredPrompt readiness={readiness} />;
    }
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // All gates pass, render children
  return <>{children}</>;
}

/**
 * RequireFullReadiness - Wrapper that requires all readiness gates to pass
 */
export function RequireFullReadiness({
  children,
  workspaceId,
}: {
  children: ReactNode;
  workspaceId: string | null | undefined;
}) {
  return (
    <ReadinessGate
      workspaceId={workspaceId}
      requiredGates={['admin', 'rbac', 'warehouse', 'vehicle', 'packaging_rules']}
    >
      {children}
    </ReadinessGate>
  );
}

/**
 * RequireOperationalSetup - Wrapper that requires warehouse and vehicle
 */
export function RequireOperationalSetup({
  children,
  workspaceId,
}: {
  children: ReactNode;
  workspaceId: string | null | undefined;
}) {
  return (
    <ReadinessGate workspaceId={workspaceId} requiredGates={['warehouse', 'vehicle']}>
      {children}
    </ReadinessGate>
  );
}

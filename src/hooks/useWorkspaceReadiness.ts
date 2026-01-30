/**
 * Workspace Readiness Hook
 *
 * Provides workspace readiness status for platform gating.
 * Used to block planning features until all setup requirements are met.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  WorkspaceReadiness,
  ReadinessGate,
  UserOnboardingStatus,
} from '@/types/onboarding';

// =====================================================
// Query Keys
// =====================================================

export const readinessKeys = {
  all: ['workspace-readiness'] as const,
  workspace: (workspaceId: string) =>
    [...readinessKeys.all, workspaceId] as const,
  userOnboarding: () => ['user-onboarding-status'] as const,
  canAccessPlanning: (workspaceId: string) =>
    ['can-access-planning', workspaceId] as const,
};

// =====================================================
// Hooks
// =====================================================

/**
 * Get workspace readiness status
 */
export function useWorkspaceReadiness(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: readinessKeys.workspace(workspaceId ?? ''),
    queryFn: async (): Promise<WorkspaceReadiness | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_workspace_readiness', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        console.error('Error fetching workspace readiness:', error);
        throw error;
      }

      return data as WorkspaceReadiness;
    },
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Check if planning features can be accessed for a workspace
 */
export function useCanAccessPlanning(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: readinessKeys.canAccessPlanning(workspaceId ?? ''),
    queryFn: async (): Promise<boolean> => {
      if (!workspaceId) return false;

      const { data, error } = await supabase.rpc('can_access_planning', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        console.error('Error checking planning access:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}

/**
 * Get current user's onboarding status
 */
export function useUserOnboardingStatus() {
  return useQuery({
    queryKey: readinessKeys.userOnboarding(),
    queryFn: async (): Promise<UserOnboardingStatus | null> => {
      const { data, error } = await supabase.rpc('get_user_onboarding_status');

      if (error) {
        console.error('Error fetching user onboarding status:', error);
        throw error;
      }

      return data as UserOnboardingStatus;
    },
    staleTime: 30000,
  });
}

/**
 * Hook to check specific readiness gates
 */
export function useReadinessGate(
  workspaceId: string | null | undefined,
  requiredGates: ReadinessGate[]
) {
  const { data: readiness, isLoading, error } = useWorkspaceReadiness(workspaceId);

  const gatesPass = requiredGates.every((gate) => {
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
  });

  const missingGates = requiredGates.filter((gate) => {
    if (!readiness) return true;
    switch (gate) {
      case 'admin':
        return !readiness.has_admin;
      case 'rbac':
        return !readiness.has_rbac_configured;
      case 'warehouse':
        return !readiness.has_warehouse;
      case 'vehicle':
        return !readiness.has_vehicle;
      case 'packaging_rules':
        return !readiness.has_packaging_rules;
      default:
        return true;
    }
  });

  return {
    gatesPass,
    missingGates,
    readiness,
    isLoading,
    error,
  };
}

/**
 * Hook for operational setup flow
 * Returns what setup steps are needed
 */
export function useOperationalSetupNeeded(workspaceId: string | null | undefined) {
  const { data: readiness, isLoading } = useWorkspaceReadiness(workspaceId);

  return {
    isLoading,
    needsWarehouse: readiness ? !readiness.has_warehouse : true,
    needsVehicle: readiness ? !readiness.has_vehicle : true,
    isReady: readiness?.is_ready ?? false,
    progressPercentage: readiness?.progress_percentage ?? 0,
  };
}

// =====================================================
// Mutations
// =====================================================

/**
 * Mutation to manually refresh readiness (after adding vehicle/warehouse)
 */
export function useRefreshReadiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      // Refetch the readiness data
      const { data, error } = await supabase.rpc('get_workspace_readiness', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      return data as WorkspaceReadiness;
    },
    onSuccess: (data, workspaceId) => {
      // Update cache
      queryClient.setQueryData(readinessKeys.workspace(workspaceId), data);

      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: readinessKeys.canAccessPlanning(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: readinessKeys.userOnboarding(),
      });
    },
  });
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get the next setup step based on current readiness
 */
export function getNextSetupStep(
  readiness: WorkspaceReadiness | null
): 'warehouse' | 'vehicle' | 'complete' | null {
  if (!readiness) return null;

  if (!readiness.has_warehouse) return 'warehouse';
  if (!readiness.has_vehicle) return 'vehicle';
  if (readiness.is_ready) return 'complete';

  return null;
}

/**
 * Get human-readable status message
 */
export function getReadinessMessage(readiness: WorkspaceReadiness | null): string {
  if (!readiness) return 'Loading workspace status...';

  if (readiness.is_ready) {
    return 'Your workspace is fully configured and ready to use.';
  }

  const missing = readiness.missing_items;
  if (missing.length === 0) {
    return 'Workspace setup is complete.';
  }

  const items = missing.map((item) => {
    switch (item) {
      case 'admin':
        return 'an admin user';
      case 'rbac':
        return 'access control';
      case 'warehouse':
        return 'a warehouse';
      case 'vehicle':
        return 'a vehicle';
      case 'packaging_rules':
        return 'packaging rules';
      default:
        return item;
    }
  });

  if (items.length === 1) {
    return `You need to add ${items[0]} to complete setup.`;
  }

  const lastItem = items.pop();
  return `You need to add ${items.join(', ')} and ${lastItem} to complete setup.`;
}

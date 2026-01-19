/**
 * RFC-012 Phase 6: Requisition Workflow Analytics Hooks
 *
 * React Query hooks for fetching requisition workflow analytics
 * Follows the established pattern from useAnalytics.ts
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  analyticsAPI,
  type StorefrontRequisitionAnalytics,
  type FleetOpsDispatchAnalytics,
  type PackagingTypeDistribution,
} from '@/integrations/supabase/analytics';

// ============================================================================
// Query Key Factory
// ============================================================================

export const requisitionAnalyticsKeys = {
  all: ['requisition-analytics'] as const,
  storefront: (startDate?: string | null, endDate?: string | null) =>
    [...requisitionAnalyticsKeys.all, 'storefront', { startDate, endDate }] as const,
  fleetops: (startDate?: string | null, endDate?: string | null) =>
    [...requisitionAnalyticsKeys.all, 'fleetops', { startDate, endDate }] as const,
  packaging: (startDate?: string | null, endDate?: string | null) =>
    [...requisitionAnalyticsKeys.all, 'packaging', { startDate, endDate }] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch Storefront requisition workflow analytics
 * @param startDate - Optional start date (ISO string)
 * @param endDate - Optional end date (ISO string)
 * @returns Query result with Storefront analytics data
 */
export function useStorefrontRequisitionAnalytics(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<StorefrontRequisitionAnalytics, Error> {
  return useQuery({
    queryKey: requisitionAnalyticsKeys.storefront(startDate, endDate),
    queryFn: () => analyticsAPI.getStorefrontRequisitionAnalytics(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch FleetOps dispatch workflow analytics
 * @param startDate - Optional start date (ISO string)
 * @param endDate - Optional end date (ISO string)
 * @returns Query result with FleetOps analytics data
 */
export function useFleetOpsDispatchAnalytics(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<FleetOpsDispatchAnalytics, Error> {
  return useQuery({
    queryKey: requisitionAnalyticsKeys.fleetops(startDate, endDate),
    queryFn: () => analyticsAPI.getFleetOpsDispatchAnalytics(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch packaging type distribution analytics
 * @param startDate - Optional start date (ISO string)
 * @param endDate - Optional end date (ISO string)
 * @returns Query result with packaging distribution data
 */
export function usePackagingTypeDistribution(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<PackagingTypeDistribution[], Error> {
  return useQuery({
    queryKey: requisitionAnalyticsKeys.packaging(startDate, endDate),
    queryFn: () => analyticsAPI.getPackagingTypeDistribution(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

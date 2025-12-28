/**
 * Phase 2: Analytics Backend - Ticket A7
 * React Query Hooks for Analytics API
 *
 * Purpose: Provide React hooks for analytics data with caching and auto-refresh
 * Performance: Leverages React Query caching + server-side pre-aggregation
 *
 * IMPORTANT: These hooks are READ-ONLY.
 * All analytics logic resides in the database.
 * NO client-side aggregation allowed.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  analyticsAPI,
  type DeliveryKPIs,
  type TopVehiclePerformance,
  type DriverKPIs,
  type TopDriverPerformance,
  type VehicleKPIs,
  type VehicleMaintenanceNeeded,
  type CostKPIs,
  type VehicleCostBreakdown,
  type DriverCostBreakdown,
  type DashboardSummary,
} from '@/integrations/supabase/analytics';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  delivery: () => [...analyticsKeys.all, 'delivery'] as const,
  deliveryKPIs: (startDate?: string | null, endDate?: string | null) =>
    [...analyticsKeys.delivery(), 'kpis', { startDate, endDate }] as const,
  topVehicles: (limit: number) =>
    [...analyticsKeys.delivery(), 'top-vehicles', limit] as const,

  drivers: () => [...analyticsKeys.all, 'drivers'] as const,
  driverKPIs: () => [...analyticsKeys.drivers(), 'kpis'] as const,
  topDrivers: (metric: string, limit: number) =>
    [...analyticsKeys.drivers(), 'top', metric, limit] as const,

  vehicles: () => [...analyticsKeys.all, 'vehicles'] as const,
  vehicleKPIs: () => [...analyticsKeys.vehicles(), 'kpis'] as const,
  vehicleMaintenance: () => [...analyticsKeys.vehicles(), 'maintenance'] as const,

  costs: () => [...analyticsKeys.all, 'costs'] as const,
  costKPIs: () => [...analyticsKeys.costs(), 'kpis'] as const,
  vehicleCosts: (limit: number) => [...analyticsKeys.costs(), 'vehicles', limit] as const,
  driverCosts: (limit: number) => [...analyticsKeys.costs(), 'drivers', limit] as const,

  dashboard: (startDate?: string | null, endDate?: string | null) =>
    [...analyticsKeys.all, 'dashboard', { startDate, endDate }] as const,
};

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// 1. DELIVERY PERFORMANCE HOOKS
// ============================================================================

/**
 * Hook to fetch delivery performance KPIs
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @param options - React Query options
 */
export function useDeliveryKPIs(
  startDate?: string | null,
  endDate?: string | null,
  options?: Omit<UseQueryOptions<DeliveryKPIs>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.deliveryKPIs(startDate, endDate),
    queryFn: () => analyticsAPI.getDeliveryKPIs(startDate, endDate),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

/**
 * Hook to fetch top performing vehicles by on-time rate
 * @param limit - Number of results (default: 10)
 * @param options - React Query options
 */
export function useTopVehiclesByOnTime(
  limit: number = 10,
  options?: Omit<UseQueryOptions<TopVehiclePerformance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.topVehicles(limit),
    queryFn: () => analyticsAPI.getTopVehiclesByOnTime(limit),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

// ============================================================================
// 2. DRIVER EFFICIENCY HOOKS
// ============================================================================

/**
 * Hook to fetch driver efficiency KPIs
 * @param options - React Query options
 */
export function useDriverKPIs(
  options?: Omit<UseQueryOptions<DriverKPIs>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.driverKPIs(),
    queryFn: () => analyticsAPI.getDriverKPIs(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

/**
 * Hook to fetch top performing drivers
 * @param metric - Metric to sort by: 'on_time_rate', 'fuel_efficiency', or 'deliveries'
 * @param limit - Number of results (default: 10)
 * @param options - React Query options
 */
export function useTopDrivers(
  metric: 'on_time_rate' | 'fuel_efficiency' | 'deliveries' = 'on_time_rate',
  limit: number = 10,
  options?: Omit<UseQueryOptions<TopDriverPerformance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.topDrivers(metric, limit),
    queryFn: () => analyticsAPI.getTopDrivers(metric, limit),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

// ============================================================================
// 3. VEHICLE UTILIZATION HOOKS
// ============================================================================

/**
 * Hook to fetch vehicle utilization KPIs
 * @param options - React Query options
 */
export function useVehicleKPIs(
  options?: Omit<UseQueryOptions<VehicleKPIs>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.vehicleKPIs(),
    queryFn: () => analyticsAPI.getVehicleKPIs(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

/**
 * Hook to fetch vehicles needing maintenance
 * @param options - React Query options
 */
export function useVehiclesNeedingMaintenance(
  options?: Omit<UseQueryOptions<VehicleMaintenanceNeeded[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.vehicleMaintenance(),
    queryFn: () => analyticsAPI.getVehiclesNeedingMaintenance(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

// ============================================================================
// 4. COST ANALYSIS HOOKS
// ============================================================================

/**
 * Hook to fetch cost analysis KPIs
 * @param options - React Query options
 */
export function useCostKPIs(
  options?: Omit<UseQueryOptions<CostKPIs>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.costKPIs(),
    queryFn: () => analyticsAPI.getCostKPIs(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

/**
 * Hook to fetch vehicle cost breakdown
 * @param limit - Number of results (default: 10)
 * @param options - React Query options
 */
export function useVehicleCosts(
  limit: number = 10,
  options?: Omit<UseQueryOptions<VehicleCostBreakdown[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.vehicleCosts(limit),
    queryFn: () => analyticsAPI.getVehicleCosts(limit),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

/**
 * Hook to fetch driver cost breakdown
 * @param limit - Number of results (default: 10)
 * @param options - React Query options
 */
export function useDriverCosts(
  limit: number = 10,
  options?: Omit<UseQueryOptions<DriverCostBreakdown[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.driverCosts(limit),
    queryFn: () => analyticsAPI.getDriverCosts(limit),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

// ============================================================================
// 5. DASHBOARD SUMMARY HOOK
// ============================================================================

/**
 * Hook to fetch complete dashboard summary (all KPIs in one call)
 * @param startDate - Optional start date for delivery metrics (YYYY-MM-DD)
 * @param endDate - Optional end date for delivery metrics (YYYY-MM-DD)
 * @param options - React Query options
 */
export function useDashboardSummary(
  startDate?: string | null,
  endDate?: string | null,
  options?: Omit<UseQueryOptions<DashboardSummary>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(startDate, endDate),
    queryFn: () => analyticsAPI.getDashboardSummary(startDate, endDate),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    ...options,
  });
}

// ============================================================================
// CONVENIENCE HOOK: All Analytics Data
// ============================================================================

/**
 * Hook to fetch all analytics data at once
 * Useful for dashboard pages that need multiple metrics
 * @param startDate - Optional start date for delivery metrics
 * @param endDate - Optional end date for delivery metrics
 */
export function useAllAnalytics(
  startDate?: string | null,
  endDate?: string | null
) {
  const deliveryKPIs = useDeliveryKPIs(startDate, endDate);
  const driverKPIs = useDriverKPIs();
  const vehicleKPIs = useVehicleKPIs();
  const costKPIs = useCostKPIs();

  return {
    delivery: deliveryKPIs,
    drivers: driverKPIs,
    vehicles: vehicleKPIs,
    costs: costKPIs,
    isLoading:
      deliveryKPIs.isLoading ||
      driverKPIs.isLoading ||
      vehicleKPIs.isLoading ||
      costKPIs.isLoading,
    isError:
      deliveryKPIs.isError ||
      driverKPIs.isError ||
      vehicleKPIs.isError ||
      costKPIs.isError,
    error:
      deliveryKPIs.error ||
      driverKPIs.error ||
      vehicleKPIs.error ||
      costKPIs.error,
  };
}

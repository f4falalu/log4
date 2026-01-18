/**
 * Resource Utilization Analytics Hooks
 * React Query hooks for vehicle payload, program performance, driver utilization,
 * route efficiency, facility coverage, and cost analysis
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getVehiclePayloadUtilization,
  getProgramPerformance,
  getDriverUtilization,
  getRouteEfficiency,
  getFacilityCoverage,
  getCostByProgram,
} from '@/integrations/supabase/analytics';
import type {
  VehiclePayloadUtilization,
  ProgramPerformance,
  DriverUtilization,
  RouteEfficiency,
  FacilityCoverage,
  CostByProgram,
} from '@/types';

// ============================================================================
// 1. VEHICLE PAYLOAD UTILIZATION
// ============================================================================

/**
 * Hook to fetch vehicle payload utilization metrics
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @param vehicleId - Optional vehicle ID to filter by
 * @returns Query result with vehicle payload and weight utilization data
 */
export function useVehiclePayloadUtilization(
  startDate?: string | null,
  endDate?: string | null,
  vehicleId?: string | null
): UseQueryResult<VehiclePayloadUtilization[], Error> {
  return useQuery({
    queryKey: ['vehicle-payload-utilization', startDate, endDate, vehicleId],
    queryFn: () => getVehiclePayloadUtilization(startDate, endDate, vehicleId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// 2. PROGRAM PERFORMANCE
// ============================================================================

/**
 * Hook to fetch delivery performance by health program
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Query result with program performance metrics
 */
export function useProgramPerformance(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<ProgramPerformance[], Error> {
  return useQuery({
    queryKey: ['program-performance', startDate, endDate],
    queryFn: () => getProgramPerformance(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// 3. DRIVER UTILIZATION
// ============================================================================

/**
 * Hook to fetch driver utilization metrics (deliveries per week)
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Query result with driver utilization data and status
 */
export function useDriverUtilization(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<DriverUtilization[], Error> {
  return useQuery({
    queryKey: ['driver-utilization', startDate, endDate],
    queryFn: () => getDriverUtilization(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// 4. ROUTE EFFICIENCY
// ============================================================================

/**
 * Hook to fetch route efficiency analysis (actual vs estimated metrics)
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Query result with route efficiency metrics and ratings
 */
export function useRouteEfficiency(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<RouteEfficiency[], Error> {
  return useQuery({
    queryKey: ['route-efficiency', startDate, endDate],
    queryFn: () => getRouteEfficiency(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// 5. FACILITY COVERAGE
// ============================================================================

/**
 * Hook to fetch facility delivery coverage metrics
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @param programme - Optional program to filter by
 * @returns Query result with facility coverage data
 */
export function useFacilityCoverage(
  startDate?: string | null,
  endDate?: string | null,
  programme?: string | null
): UseQueryResult<FacilityCoverage[], Error> {
  return useQuery({
    queryKey: ['facility-coverage', startDate, endDate, programme],
    queryFn: () => getFacilityCoverage(startDate, endDate, programme),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================================
// 6. COST BY PROGRAM
// ============================================================================

/**
 * Hook to fetch cost analysis by health program
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Query result with cost metrics per program
 */
export function useCostByProgram(
  startDate?: string | null,
  endDate?: string | null
): UseQueryResult<CostByProgram[], Error> {
  return useQuery({
    queryKey: ['cost-by-program', startDate, endDate],
    queryFn: () => getCostByProgram(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Phase 2: Analytics Backend - Ticket A6
 * Supabase RPC Wrappers for Analytics Functions
 *
 * Purpose: Type-safe API layer for querying analytics materialized views
 * Performance: All queries target < 100ms (server-side pre-aggregated data)
 *
 * IMPORTANT: This file contains READ-ONLY functions.
 * All analytics logic resides in the database (A5 functions).
 * NO client-side aggregation allowed.
 */

import { supabase } from './client';

// ============================================================================
// TYPES - Analytics Function Response Types
// ============================================================================

export interface DeliveryKPIs {
  total_batches: number;
  completed_batches: number;
  on_time_batches: number;
  late_batches: number;
  on_time_rate: number;
  avg_completion_time_hours: number;
  total_items_delivered: number;
  total_distance_km: number;
}

export interface TopVehiclePerformance {
  vehicle_id: string;
  vehicle_number: string;
  vehicle_type: string;
  on_time_batches: number;
  total_batches: number;
  on_time_rate: number;
}

export interface DriverKPIs {
  total_drivers: number;
  active_drivers: number;
  avg_on_time_rate: number;
  avg_fuel_efficiency: number;
  total_incidents: number;
}

export interface TopDriverPerformance {
  driver_id: string;
  driver_name: string;
  on_time_rate: number;
  completed_batches: number;
  total_items_delivered: number;
  fuel_efficiency_km_per_liter: number;
  total_incidents: number;
}

export interface VehicleKPIs {
  total_vehicles: number;
  active_vehicles: number;
  in_maintenance: number;
  avg_utilization_rate: number;
  avg_fuel_efficiency: number;
  total_maintenance_cost: number;
}

export interface VehicleMaintenanceNeeded {
  vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  total_distance_km: number;
  last_maintenance_date: string | null;
  maintenance_in_progress: number;
  total_maintenance_cost: number;
}

export interface CostKPIs {
  total_system_cost: number;
  total_maintenance_cost: number;
  total_fuel_cost: number;
  avg_cost_per_item: number;
  avg_cost_per_km: number;
  active_vehicles: number;
  active_drivers: number;
  total_items_delivered: number;
}

export interface VehicleCostBreakdown {
  vehicle_id: string;
  total_cost: number;
  maintenance_cost: number;
  fuel_cost: number;
  fuel_consumed_liters: number;
  maintenance_events: number;
}

export interface DriverCostBreakdown {
  driver_id: string;
  total_cost: number;
  fuel_cost: number;
  operational_cost: number;
  items_delivered: number;
  distance_covered: number;
  cost_per_item: number;
}

export interface DashboardSummary {
  total_deliveries: number;
  on_time_rate: number;
  avg_completion_hours: number;
  total_items: number;
  active_vehicles: number;
  vehicle_utilization_rate: number;
  vehicles_in_maintenance: number;
  active_drivers: number;
  driver_on_time_rate: number;
  total_incidents: number;
  total_cost: number;
  cost_per_item: number;
  cost_per_km: number;
}

// ============================================================================
// API ERROR HANDLING
// ============================================================================

export class AnalyticsAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AnalyticsAPIError';
  }
}

function handleSupabaseError(error: unknown, functionName: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    throw new AnalyticsAPIError(
      `Analytics API error in ${functionName}: ${error.message}`,
      'code' in error ? String(error.code) : undefined,
      error
    );
  }
  throw new AnalyticsAPIError(`Unknown error in ${functionName}`, undefined, error);
}

// ============================================================================
// 1. DELIVERY PERFORMANCE API
// ============================================================================

/**
 * Get delivery performance KPIs for a date range
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * @returns Delivery performance metrics
 */
export async function getDeliveryKPIs(
  startDate?: string | null,
  endDate?: string | null
): Promise<DeliveryKPIs> {
  const { data, error } = await supabase.schema('analytics').rpc('get_delivery_kpis', {
    start_date: startDate || null,
    end_date: endDate || null,
  });

  if (error) handleSupabaseError(error, 'getDeliveryKPIs');
  if (!data || data.length === 0) {
    throw new AnalyticsAPIError('No delivery KPIs data returned');
  }

  return data[0] as DeliveryKPIs;
}

/**
 * Get top performing vehicles by on-time delivery rate
 * @param limit - Number of results to return (default: 10)
 * @returns Array of top vehicles sorted by on-time rate
 */
export async function getTopVehiclesByOnTime(
  limit: number = 10
): Promise<TopVehiclePerformance[]> {
  const { data, error } = await supabase.schema('analytics').rpc('get_top_vehicles_by_ontime', {
    limit_count: limit,
  });

  if (error) handleSupabaseError(error, 'getTopVehiclesByOnTime');
  return (data || []) as TopVehiclePerformance[];
}

// ============================================================================
// 2. DRIVER EFFICIENCY API
// ============================================================================

/**
 * Get overall driver efficiency KPIs
 * @returns Driver efficiency metrics
 */
export async function getDriverKPIs(): Promise<DriverKPIs> {
  const { data, error } = await supabase.schema('analytics').rpc('get_driver_kpis');

  if (error) handleSupabaseError(error, 'getDriverKPIs');
  if (!data || data.length === 0) {
    throw new AnalyticsAPIError('No driver KPIs data returned');
  }

  return data[0] as DriverKPIs;
}

/**
 * Get top performing drivers by specified metric
 * @param metric - Metric to sort by: 'on_time_rate', 'fuel_efficiency', or 'deliveries'
 * @param limit - Number of results to return (default: 10)
 * @returns Array of top drivers sorted by metric
 */
export async function getTopDrivers(
  metric: 'on_time_rate' | 'fuel_efficiency' | 'deliveries' = 'on_time_rate',
  limit: number = 10
): Promise<TopDriverPerformance[]> {
  const { data, error } = await supabase.schema('analytics').rpc('get_top_drivers', {
    metric,
    limit_count: limit,
  });

  if (error) handleSupabaseError(error, 'getTopDrivers');
  return (data || []) as TopDriverPerformance[];
}

// ============================================================================
// 3. VEHICLE UTILIZATION API
// ============================================================================

/**
 * Get overall vehicle utilization KPIs
 * @returns Vehicle utilization metrics
 */
export async function getVehicleKPIs(): Promise<VehicleKPIs> {
  const { data, error } = await supabase.schema('analytics').rpc('get_vehicle_kpis');

  if (error) handleSupabaseError(error, 'getVehicleKPIs');
  if (!data || data.length === 0) {
    throw new AnalyticsAPIError('No vehicle KPIs data returned');
  }

  return data[0] as VehicleKPIs;
}

/**
 * Get vehicles that need maintenance soon
 * @returns Array of vehicles needing maintenance
 */
export async function getVehiclesNeedingMaintenance(): Promise<VehicleMaintenanceNeeded[]> {
  const { data, error } = await supabase.schema('analytics').rpc('get_vehicles_needing_maintenance');

  if (error) handleSupabaseError(error, 'getVehiclesNeedingMaintenance');
  return (data || []) as VehicleMaintenanceNeeded[];
}

// ============================================================================
// 4. COST ANALYSIS API
// ============================================================================

/**
 * Get overall cost analysis KPIs
 * @returns Cost metrics
 */
export async function getCostKPIs(): Promise<CostKPIs> {
  const { data, error } = await supabase.schema('analytics').rpc('get_cost_kpis');

  if (error) handleSupabaseError(error, 'getCostKPIs');
  if (!data || data.length === 0) {
    throw new AnalyticsAPIError('No cost KPIs data returned');
  }

  return data[0] as CostKPIs;
}

/**
 * Get vehicle cost breakdown sorted by total cost
 * @param limit - Number of results to return (default: 10)
 * @returns Array of vehicle costs
 */
export async function getVehicleCosts(limit: number = 10): Promise<VehicleCostBreakdown[]> {
  const { data, error } = await supabase.schema('analytics').rpc('get_vehicle_costs', {
    limit_count: limit,
  });

  if (error) handleSupabaseError(error, 'getVehicleCosts');
  return (data || []) as VehicleCostBreakdown[];
}

/**
 * Get driver cost breakdown sorted by total cost
 * @param limit - Number of results to return (default: 10)
 * @returns Array of driver costs
 */
export async function getDriverCosts(limit: number = 10): Promise<DriverCostBreakdown[]> {
  const { data, error } = await supabase.schema('analytics').rpc('get_driver_costs', {
    limit_count: limit,
  });

  if (error) handleSupabaseError(error, 'getDriverCosts');
  return (data || []) as DriverCostBreakdown[];
}

// ============================================================================
// 5. DASHBOARD SUMMARY API
// ============================================================================

/**
 * Get complete dashboard summary (all KPIs in one call)
 * @param startDate - Optional start date for delivery metrics (YYYY-MM-DD)
 * @param endDate - Optional end date for delivery metrics (YYYY-MM-DD)
 * @returns Complete dashboard summary
 */
export async function getDashboardSummary(
  startDate?: string | null,
  endDate?: string | null
): Promise<DashboardSummary> {
  const { data, error } = await supabase.schema('analytics').rpc('get_dashboard_summary', {
    start_date: startDate || null,
    end_date: endDate || null,
  });

  if (error) handleSupabaseError(error, 'getDashboardSummary');
  if (!data || data.length === 0) {
    throw new AnalyticsAPIError('No dashboard summary data returned');
  }

  return data[0] as DashboardSummary;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const analyticsAPI = {
  // Delivery performance
  getDeliveryKPIs,
  getTopVehiclesByOnTime,

  // Driver efficiency
  getDriverKPIs,
  getTopDrivers,

  // Vehicle utilization
  getVehicleKPIs,
  getVehiclesNeedingMaintenance,

  // Cost analysis
  getCostKPIs,
  getVehicleCosts,
  getDriverCosts,

  // Dashboard summary
  getDashboardSummary,
};

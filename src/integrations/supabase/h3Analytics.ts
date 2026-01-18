/**
 * H3 Analytics API
 *
 * Supabase RPC wrappers for H3 hexagonal grid metrics aggregation.
 * Used by the Planning map to visualize demand, capacity, and SLA data.
 *
 * Pattern follows analytics.ts - READ-ONLY functions, server-side aggregation.
 */

import { supabase } from './client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Metrics for a single H3 cell returned from the database.
 */
export interface H3CellMetrics {
  h3_index: string;
  resolution: number;
  deliveries: number;
  demand_forecast: number;
  capacity_available: number;
  capacity_utilized: number;
  utilization_pct: number;
  sla_at_risk: number;
  sla_breach_pct: number;
  active_facilities: number;
  active_warehouses: number;
}

/**
 * Warehouse coverage data with aggregated metrics.
 */
export interface WarehouseCoverageData {
  warehouse_id: string;
  warehouse_name: string;
  cells: string[];
  total_demand: number;
  capacity_remaining: number;
  facilities_covered: number;
}

/**
 * Date range filter for H3 metrics queries.
 */
export interface H3DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class H3AnalyticsError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'H3AnalyticsError';
  }
}

function handleError(error: unknown, functionName: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    throw new H3AnalyticsError(
      `H3 Analytics error in ${functionName}: ${(error as { message: string }).message}`,
      'code' in error ? String((error as { code: unknown }).code) : undefined,
      error
    );
  }
  throw new H3AnalyticsError(`Unknown error in ${functionName}`, undefined, error);
}

// ============================================================================
// H3 CELL METRICS API
// ============================================================================

/**
 * Get metrics for a set of H3 cells.
 * Aggregates delivery, capacity, and SLA data from facilities within each cell.
 *
 * @param h3Indexes - Array of H3 cell indexes to fetch metrics for
 * @param resolution - H3 resolution level (6-11)
 * @param dateRange - Optional date range filter
 * @returns Array of H3 cell metrics
 */
export async function getH3CellMetrics(
  h3Indexes: string[],
  resolution: number,
  dateRange?: H3DateRange | null
): Promise<H3CellMetrics[]> {
  // If no cells requested, return empty array
  if (h3Indexes.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_h3_cell_metrics', {
    p_h3_indexes: h3Indexes,
    p_resolution: resolution,
    p_start_date: dateRange?.start || null,
    p_end_date: dateRange?.end || null,
  });

  if (error) handleError(error, 'getH3CellMetrics');
  return (data || []) as H3CellMetrics[];
}

/**
 * Get warehouse coverage cells with aggregated demand.
 * Uses H3 gridDisk to compute the coverage area.
 *
 * @param warehouseId - UUID of the warehouse
 * @param radius - k-ring radius (number of hexagon rings)
 * @param resolution - H3 resolution level
 * @returns Coverage data including cells and demand totals
 */
export async function getWarehouseCoverage(
  warehouseId: string,
  radius: number,
  resolution: number
): Promise<WarehouseCoverageData | null> {
  const { data, error } = await supabase.rpc('get_warehouse_h3_coverage', {
    p_warehouse_id: warehouseId,
    p_radius: radius,
    p_resolution: resolution,
  });

  if (error) handleError(error, 'getWarehouseCoverage');
  return data?.[0] as WarehouseCoverageData | null;
}

/**
 * Get coverage data for multiple warehouses in batch.
 *
 * @param warehouseIds - Array of warehouse UUIDs
 * @param radius - k-ring radius
 * @param resolution - H3 resolution level
 * @returns Array of coverage data per warehouse
 */
export async function getBatchWarehouseCoverage(
  warehouseIds: string[],
  radius: number,
  resolution: number
): Promise<WarehouseCoverageData[]> {
  if (warehouseIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_batch_warehouse_h3_coverage', {
    p_warehouse_ids: warehouseIds,
    p_radius: radius,
    p_resolution: resolution,
  });

  if (error) handleError(error, 'getBatchWarehouseCoverage');
  return (data || []) as WarehouseCoverageData[];
}

/**
 * Get aggregate metrics for a geographic region (for KPI ribbon).
 *
 * @param h3Indexes - Array of H3 cell indexes in the viewport
 * @param dateRange - Optional date range filter
 * @returns Aggregated metrics for the region
 */
export async function getRegionMetrics(
  h3Indexes: string[],
  dateRange?: H3DateRange | null
): Promise<{
  total_deliveries: number;
  total_demand: number;
  avg_utilization: number;
  sla_at_risk_count: number;
  facilities_count: number;
  warehouses_count: number;
}> {
  if (h3Indexes.length === 0) {
    return {
      total_deliveries: 0,
      total_demand: 0,
      avg_utilization: 0,
      sla_at_risk_count: 0,
      facilities_count: 0,
      warehouses_count: 0,
    };
  }

  const { data, error } = await supabase.rpc('get_h3_region_metrics', {
    p_h3_indexes: h3Indexes,
    p_start_date: dateRange?.start || null,
    p_end_date: dateRange?.end || null,
  });

  if (error) handleError(error, 'getRegionMetrics');

  return data?.[0] || {
    total_deliveries: 0,
    total_demand: 0,
    avg_utilization: 0,
    sla_at_risk_count: 0,
    facilities_count: 0,
    warehouses_count: 0,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const h3AnalyticsAPI = {
  getH3CellMetrics,
  getWarehouseCoverage,
  getBatchWarehouseCoverage,
  getRegionMetrics,
};

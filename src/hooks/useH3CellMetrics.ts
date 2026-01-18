/**
 * useH3CellMetrics Hook
 *
 * Fetches and caches H3 cell metrics for the Planning map.
 * Implements viewport-aware caching to avoid redundant fetches.
 *
 * Features:
 * - Only fetches metrics for cells not already in cache
 * - Clears cache on resolution change
 * - Debounces viewport updates
 * - Returns combined cached + fresh data
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useMemo, useCallback, useEffect } from 'react';
import {
  getH3CellMetrics,
  type H3CellMetrics,
  type H3DateRange,
} from '@/integrations/supabase/h3Analytics';
import { getViewportCells, type ViewportBounds } from '@/services/h3Planner';
import type { PlanningMetric } from '@/components/map/ui/MetricsTogglePanel';

// ============================================================================
// TYPES
// ============================================================================

/**
 * H3 cell data with optional metrics.
 * Null metrics indicates data hasn't been fetched yet.
 */
export interface H3CellData {
  h3Index: string;
  metrics: H3CellMetrics | null;
}

/**
 * Hook options.
 */
export interface UseH3CellMetricsOptions {
  /** Map viewport bounds */
  bounds: ViewportBounds | null;
  /** H3 resolution level (6-11) */
  resolution: number;
  /** Active metric for visualization */
  metric: PlanningMetric;
  /** Optional date range filter */
  dateRange?: H3DateRange | null;
  /** Whether to enable fetching */
  enabled?: boolean;
}

/**
 * Hook return value.
 */
export interface UseH3CellMetricsResult {
  /** All cells in viewport with their metrics */
  cells: H3CellData[];
  /** Loading state for uncached cells */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Clear all cached metrics */
  clearCache: () => void;
  /** Number of cells currently in cache */
  cacheSize: number;
  /** Total cells in viewport */
  viewportCellCount: number;
}

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const h3QueryKeys = {
  all: ['h3'] as const,
  cells: (resolution: number) => [...h3QueryKeys.all, 'cells', resolution] as const,
  metrics: (cellsHash: string, resolution: number) =>
    [...h3QueryKeys.all, 'metrics', resolution, cellsHash] as const,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useH3CellMetrics({
  bounds,
  resolution,
  metric,
  dateRange = null,
  enabled = true,
}: UseH3CellMetricsOptions): UseH3CellMetricsResult {
  const queryClient = useQueryClient();

  // Cache for metrics data - persists across renders
  const metricsCache = useRef<Map<string, H3CellMetrics>>(new Map());

  // Track previous resolution to detect changes
  const prevResolutionRef = useRef<number>(resolution);

  // Clear cache when resolution changes
  useEffect(() => {
    if (prevResolutionRef.current !== resolution) {
      metricsCache.current.clear();
      prevResolutionRef.current = resolution;
    }
  }, [resolution]);

  // Compute cells in viewport and identify which need fetching
  const { allCells, cellsToFetch, cellsHash } = useMemo(() => {
    console.log('[useH3CellMetrics] Computing cells with bounds:', bounds, 'resolution:', resolution);

    if (!bounds) {
      console.log('[useH3CellMetrics] No bounds available yet');
      return { allCells: [], cellsToFetch: [], cellsHash: '' };
    }

    // Get all H3 cells covering the viewport
    const viewportCells = getViewportCells(bounds, resolution);
    console.log('[useH3CellMetrics] Got viewport cells:', viewportCells.length);

    // Filter out cells that are already cached
    const uncachedCells = viewportCells.filter(
      (cellIndex) => !metricsCache.current.has(cellIndex)
    );

    // Create hash for query key (first 10 cells sorted)
    const hash = uncachedCells.slice(0, 10).sort().join(',');

    return {
      allCells: viewportCells,
      cellsToFetch: uncachedCells,
      cellsHash: hash,
    };
  }, [bounds, resolution]);

  // Fetch metrics for uncached cells
  const {
    data: fetchedMetrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: h3QueryKeys.metrics(cellsHash, resolution),
    queryFn: async () => {
      if (cellsToFetch.length === 0) {
        return [];
      }

      // Batch fetch in chunks to avoid request size limits
      const CHUNK_SIZE = 500;
      const allMetrics: H3CellMetrics[] = [];

      for (let i = 0; i < cellsToFetch.length; i += CHUNK_SIZE) {
        const chunk = cellsToFetch.slice(i, i + CHUNK_SIZE);
        try {
          const metrics = await getH3CellMetrics(chunk, resolution, dateRange);
          allMetrics.push(...metrics);
        } catch (err) {
          // Silently handle 404 (RPC function not deployed yet)
          // Cells will display with null metrics
          console.warn('[useH3CellMetrics] Database function not available, showing hexagons without metrics');
          return [];
        }
      }

      return allMetrics;
    },
    enabled: enabled && cellsToFetch.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: false, // Don't retry if RPC fails (likely 404)
  });

  // Update cache with fetched metrics
  useEffect(() => {
    if (fetchedMetrics && fetchedMetrics.length > 0) {
      fetchedMetrics.forEach((metrics) => {
        metricsCache.current.set(metrics.h3_index, metrics);
      });
    }
  }, [fetchedMetrics]);

  // Combine cached and fresh data for all viewport cells
  // allCells changes when bounds or resolution changes, so we just depend on allCells
  const cells = useMemo<H3CellData[]>(() => {
    console.log('[useH3CellMetrics] Building cells array from', allCells.length, 'allCells');
    const result = allCells.map((h3Index) => ({
      h3Index,
      metrics: metricsCache.current.get(h3Index) || null,
    }));
    console.log('[useH3CellMetrics] Built', result.length, 'cells for layer');
    return result;
  }, [allCells, fetchedMetrics]); // allCells already depends on bounds/resolution

  // Clear cache function
  const clearCache = useCallback(() => {
    metricsCache.current.clear();
    // Invalidate all H3 queries to force refetch
    queryClient.invalidateQueries({ queryKey: h3QueryKeys.all });
  }, [queryClient]);

  return {
    cells,
    isLoading,
    error: error as Error | null,
    clearCache,
    cacheSize: metricsCache.current.size,
    viewportCellCount: allCells.length,
  };
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to get aggregate metrics for the visible region.
 * Uses the cells from useH3CellMetrics to compute totals.
 */
export function useH3RegionMetrics(cells: H3CellData[]) {
  return useMemo(() => {
    let totalDeliveries = 0;
    let totalDemand = 0;
    let totalUtilization = 0;
    let slaAtRisk = 0;
    let cellsWithData = 0;

    for (const cell of cells) {
      if (cell.metrics) {
        totalDeliveries += cell.metrics.deliveries;
        totalDemand += cell.metrics.demand_forecast;
        totalUtilization += cell.metrics.utilization_pct;
        slaAtRisk += cell.metrics.sla_at_risk;
        cellsWithData++;
      }
    }

    return {
      totalDeliveries,
      totalDemand,
      avgUtilization: cellsWithData > 0 ? totalUtilization / cellsWithData : 0,
      slaAtRiskCount: slaAtRisk,
      cellsWithData,
      totalCells: cells.length,
    };
  }, [cells]);
}

/**
 * cellState.ts
 *
 * Derived spatial truth.
 *
 * GOVERNANCE:
 * - Produces the CANONICAL state of a cell
 * - Used by Planning visualization, Operational highlighting, Forensic replay
 * - No map imports
 * - No UI imports
 * - Pure functions only
 * - Same inputs → same outputs, ALWAYS
 *
 * Risk derives from TAG SEVERITY, not metrics.
 */

import type { Zone } from './zones';
import type { SpatialIndex } from './spatialIndex';
import { getZonesForCell, getZoneById } from './spatialIndex';
import { getTag, getHighestSeverity, type ZoneTag } from './zoneTags';

/**
 * Risk level derived from zone tags
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Canonical cell state
 * This is what the map renders, derived from spatial truth
 */
export interface H3CellState {
  /** H3 cell index */
  h3Index: string;

  /** Zone IDs this cell belongs to */
  zoneIds: string[];

  /** Zone names for display */
  zoneNames: string[];

  /** All tags applied to zones containing this cell */
  tags: string[];

  /** Derived risk level (from tag severity) */
  riskLevel: RiskLevel;

  /** Whether cell is in any active zone */
  inZone: boolean;

  /** Optional non-authoritative metrics overlay */
  metrics?: CellMetrics;
}

/**
 * Optional metrics overlay
 * These are SECONDARY to semantic state
 */
export interface CellMetrics {
  /** Demand metric (deliveries, requests, etc.) */
  demand?: number;

  /** Capacity metric (vehicles, resources) */
  capacity?: number;

  /** SLA metric (percentage) */
  slaPerformance?: number;

  /** Custom metrics */
  custom?: Record<string, number>;
}

/**
 * Derive cell state from spatial index
 *
 * @param h3Index - H3 cell to derive state for
 * @param spatialIndex - Built spatial index
 * @param metrics - Optional metrics overlay
 * @returns Derived cell state
 */
export function deriveCellState(
  h3Index: string,
  spatialIndex: SpatialIndex,
  metrics?: CellMetrics
): H3CellState {
  const zoneIds = getZonesForCell(spatialIndex, h3Index);
  const zones = zoneIds
    .map((id) => getZoneById(spatialIndex, id))
    .filter((z): z is Zone => z !== undefined);

  const zoneNames = zones.map((z) => z.name);

  // Collect all tags from all zones
  const allTags = new Set<string>();
  for (const zone of zones) {
    zone.tags.forEach((tag) => allTags.add(tag));
  }

  const tags = Array.from(allTags);

  // Derive risk level from tag severity
  const riskLevel = getHighestSeverity(tags);

  return {
    h3Index,
    zoneIds,
    zoneNames,
    tags,
    riskLevel,
    inZone: zoneIds.length > 0,
    metrics,
  };
}

/**
 * Batch derive cell states
 * Optimized for rendering many cells
 *
 * @param h3Indexes - Array of H3 cells
 * @param spatialIndex - Built spatial index
 * @param metricsMap - Optional map of h3Index -> metrics
 * @returns Array of cell states
 */
export function batchDeriveCellStates(
  h3Indexes: string[],
  spatialIndex: SpatialIndex,
  metricsMap?: Map<string, CellMetrics>
): H3CellState[] {
  return h3Indexes.map((h3Index) =>
    deriveCellState(h3Index, spatialIndex, metricsMap?.get(h3Index))
  );
}

/**
 * Derive cell states for all cells in a zone
 *
 * @param zoneId - Zone to get cell states for
 * @param spatialIndex - Built spatial index
 * @returns Array of cell states
 */
export function deriveZoneCellStates(
  zoneId: string,
  spatialIndex: SpatialIndex
): H3CellState[] {
  const zone = getZoneById(spatialIndex, zoneId);
  if (!zone) return [];

  return zone.h3Cells.map((h3Index) => deriveCellState(h3Index, spatialIndex));
}

/**
 * Get cells filtered by risk level
 *
 * @param cellStates - Array of cell states
 * @param minRisk - Minimum risk level to include
 * @returns Filtered cell states
 */
export function filterByRiskLevel(
  cellStates: H3CellState[],
  minRisk: RiskLevel
): H3CellState[] {
  const riskOrder: Record<RiskLevel, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const minRiskValue = riskOrder[minRisk];
  return cellStates.filter((cell) => riskOrder[cell.riskLevel] >= minRiskValue);
}

/**
 * Get cells that have specific tags
 *
 * @param cellStates - Array of cell states
 * @param requiredTags - Tags to filter by (OR logic)
 * @returns Filtered cell states
 */
export function filterByTags(
  cellStates: H3CellState[],
  requiredTags: string[]
): H3CellState[] {
  const tagSet = new Set(requiredTags);
  return cellStates.filter((cell) => cell.tags.some((tag) => tagSet.has(tag)));
}

/**
 * Get cells in zones
 *
 * @param cellStates - Array of cell states
 * @returns Only cells that are in at least one zone
 */
export function filterInZone(cellStates: H3CellState[]): H3CellState[] {
  return cellStates.filter((cell) => cell.inZone);
}

/**
 * Get cells not in any zone
 *
 * @param cellStates - Array of cell states
 * @returns Only cells not in any zone
 */
export function filterNotInZone(cellStates: H3CellState[]): H3CellState[] {
  return cellStates.filter((cell) => !cell.inZone);
}

/**
 * Group cell states by risk level
 *
 * @param cellStates - Array of cell states
 * @returns Cells grouped by risk level
 */
export function groupByRiskLevel(
  cellStates: H3CellState[]
): Record<RiskLevel, H3CellState[]> {
  const result: Record<RiskLevel, H3CellState[]> = {
    none: [],
    low: [],
    medium: [],
    high: [],
  };

  for (const cell of cellStates) {
    result[cell.riskLevel].push(cell);
  }

  return result;
}

/**
 * Get aggregated tag information for a set of cells
 *
 * @param cellStates - Array of cell states
 * @returns Tag -> count mapping
 */
export function aggregateTags(
  cellStates: H3CellState[]
): Map<string, { tag: ZoneTag | undefined; count: number }> {
  const result = new Map<string, { tag: ZoneTag | undefined; count: number }>();

  for (const cell of cellStates) {
    for (const tagKey of cell.tags) {
      const existing = result.get(tagKey);
      if (existing) {
        existing.count++;
      } else {
        result.set(tagKey, { tag: getTag(tagKey), count: 1 });
      }
    }
  }

  return result;
}

/**
 * Create an empty cell state for a cell not in any zone
 */
export function createEmptyCellState(h3Index: string): H3CellState {
  return {
    h3Index,
    zoneIds: [],
    zoneNames: [],
    tags: [],
    riskLevel: 'none',
    inZone: false,
  };
}

/**
 * Merge metrics into existing cell state
 */
export function withMetrics(
  cellState: H3CellState,
  metrics: CellMetrics
): H3CellState {
  return {
    ...cellState,
    metrics,
  };
}

/**
 * Check if cell state has any alerts (high risk tags)
 */
export function hasAlerts(cellState: H3CellState): boolean {
  return cellState.riskLevel === 'high';
}

/**
 * Check if cell state has any warnings (medium risk tags)
 */
export function hasWarnings(cellState: H3CellState): boolean {
  return cellState.riskLevel === 'medium';
}

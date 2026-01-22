/**
 * H3Layer.types.ts
 *
 * Strong typing for H3 layers.
 *
 * GOVERNANCE:
 * - Prevents accidental coupling to metrics, UI, or map state
 * - H3CellState is the ONLY input type for H3 layers
 * - Risk level is SEMANTIC, not metric-driven
 */

import type { RiskLevel, H3CellState as SpatialCellState } from '@/map/core/spatial';

/**
 * Re-export H3CellState from spatial core
 * This is the canonical type for cell rendering
 */
export type H3CellState = SpatialCellState;

/**
 * Re-export RiskLevel
 */
export type { RiskLevel };

/**
 * Selection state for a cell
 */
export interface H3SelectionState {
  /** Currently selected cell */
  selectedH3Index: string | null;

  /** Currently hovered cell */
  hoveredH3Index: string | null;
}

/**
 * H3 layer click handler
 */
export type H3CellClickHandler = (h3Index: string, cellState: H3CellState) => void;

/**
 * H3 layer hover handler
 */
export type H3CellHoverHandler = (h3Index: string | null) => void;

/**
 * Risk level to color mapping
 * Semantic colors - not metrics-driven
 */
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  none: 'transparent',
  low: '#22c55e',     // Green
  medium: '#f59e0b',  // Amber
  high: '#ef4444',    // Red
};

/**
 * Risk level to opacity mapping
 */
export const RISK_LEVEL_OPACITY: Record<RiskLevel, number> = {
  none: 0,
  low: 0.35,
  medium: 0.45,
  high: 0.6,
};

/**
 * Risk level to stroke color mapping
 */
export const RISK_LEVEL_STROKE: Record<RiskLevel, string> = {
  none: 'transparent',
  low: '#16a34a',     // Darker green
  medium: '#d97706',  // Darker amber
  high: '#dc2626',    // Darker red
};

/**
 * Convert cell state to GeoJSON Feature properties
 */
export interface H3FeatureProperties {
  h3Index: string;
  riskLevel: RiskLevel;
  inZone: boolean;
  zoneIds: string;        // JSON stringified array
  zoneNames: string;      // JSON stringified array
  tags: string;           // JSON stringified array

  // For data-driven styling
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
}

/**
 * Create feature properties from cell state
 */
export function cellStateToFeatureProperties(
  cellState: H3CellState
): H3FeatureProperties {
  return {
    h3Index: cellState.h3Index,
    riskLevel: cellState.riskLevel,
    inZone: cellState.inZone,
    zoneIds: JSON.stringify(cellState.zoneIds),
    zoneNames: JSON.stringify(cellState.zoneNames),
    tags: JSON.stringify(cellState.tags),

    // Pre-compute colors for data-driven styling
    fillColor: RISK_LEVEL_COLORS[cellState.riskLevel],
    fillOpacity: RISK_LEVEL_OPACITY[cellState.riskLevel],
    strokeColor: RISK_LEVEL_STROKE[cellState.riskLevel],
  };
}

/**
 * Selection highlight colors
 */
export const SELECTION_COLORS = {
  selected: {
    stroke: '#3b82f6',    // Blue
    strokeWidth: 3,
  },
  hovered: {
    stroke: '#60a5fa',    // Lighter blue
    strokeWidth: 2,
  },
};

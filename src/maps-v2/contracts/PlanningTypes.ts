/**
 * PlanningTypes.ts — Domain types for Planning Mode UI.
 *
 * Pure type definitions. No logic, no imports from runtime modules.
 */

// ─── Tool System ─────────────────────────────────────────────────────────────

export type PlanningTool = 'draw' | 'coverage' | 'tag' | 'compare' | null;

export type PlanningMetric = 'demand' | 'capacity' | 'sla' | 'risk';

export type ScenarioState = 'draft' | 'review' | 'active';

export type TimeHorizon = '30d' | '60d' | '90d' | '180d';

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface PlanningMetricsSummary {
  demandCoveredPct: number;      // 0–100
  serviceGapPct: number;         // 0–100
  slaImpactScore: number;        // 0–100
  riskExposureScore: number;     // 0–100
  lastUpdated: string;           // ISO 8601
}

// ─── Scenario ────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  state: ScenarioState;
  createdAt: string;
  timeHorizon: TimeHorizon;
  zoneIds: string[];
  metrics: PlanningMetricsSummary;
}

// ─── Coverage ────────────────────────────────────────────────────────────────

export interface CoverageRing {
  facilityId: string;
  radiusKm: number;
  h3Cells: string[];
}

export interface FacilityCoverage {
  facilityId: string;
  facilityName: string;
  rings: CoverageRing[];
  totalCellsCovered: number;
}

// ─── Comparison ──────────────────────────────────────────────────────────────

export interface ZoneComparisonResult {
  zoneAId: string;
  zoneBId: string;
  metrics: {
    [K in PlanningMetric]: {
      zoneA: number;
      zoneB: number;
      delta: number;
    };
  };
  overlapCellCount: number;
  overlapPct: number;
}

// ─── Tool Behavior ───────────────────────────────────────────────────────────

export interface PlanningToolBehavior {
  tool: PlanningTool;
  allowsEditing: boolean;
  allowsHexSelection: boolean;
  allowsDrawing: boolean;
  allowsZoneSelection: boolean;
  selectionLimit?: number;
}

export const TOOL_BEHAVIORS: Record<NonNullable<PlanningTool>, PlanningToolBehavior> = {
  draw: {
    tool: 'draw',
    allowsEditing: true,
    allowsHexSelection: false,
    allowsDrawing: true,
    allowsZoneSelection: false,
  },
  coverage: {
    tool: 'coverage',
    allowsEditing: false,
    allowsHexSelection: false,
    allowsDrawing: false,
    allowsZoneSelection: false,
  },
  tag: {
    tool: 'tag',
    allowsEditing: false,
    allowsHexSelection: true,
    allowsDrawing: false,
    allowsZoneSelection: true,
  },
  compare: {
    tool: 'compare',
    allowsEditing: false,
    allowsHexSelection: false,
    allowsDrawing: false,
    allowsZoneSelection: true,
    selectionLimit: 2,
  },
};

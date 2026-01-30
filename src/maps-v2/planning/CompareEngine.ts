/**
 * CompareEngine.ts — Zone comparison logic.
 *
 * Computes side-by-side metrics for two zones.
 * Pure computation. No MapLibre. No side effects.
 */

import type { Zone } from '../contracts/Zone';
import type { H3CellState } from '../contracts/H3CellState';
import type { ZoneComparisonResult, PlanningMetric } from '../contracts/PlanningTypes';

/**
 * Compute comparison metrics between two zones.
 */
export function compareZones(
  zoneA: Zone,
  zoneB: Zone,
  cellStates: H3CellState[]
): ZoneComparisonResult {
  const cellsA = cellStates.filter((c) => c.zoneIds.includes(zoneA.id));
  const cellsB = cellStates.filter((c) => c.zoneIds.includes(zoneB.id));

  // Shared cells
  const setA = new Set(zoneA.h3Indexes);
  const sharedCells = zoneB.h3Indexes.filter((h) => setA.has(h));
  const maxCells = Math.max(zoneA.h3Indexes.length, zoneB.h3Indexes.length);
  const overlapPct = maxCells > 0 ? (sharedCells.length / maxCells) * 100 : 0;

  // Metric computations
  const demandA = computeDemandScore(cellsA);
  const demandB = computeDemandScore(cellsB);

  const capacityA = computeCapacityScore(cellsA);
  const capacityB = computeCapacityScore(cellsB);

  const slaA = computeSlaScore(cellsA);
  const slaB = computeSlaScore(cellsB);

  const riskA = computeRiskScore(cellsA);
  const riskB = computeRiskScore(cellsB);

  const metrics: ZoneComparisonResult['metrics'] = {
    demand: { zoneA: demandA, zoneB: demandB, delta: demandA - demandB },
    capacity: { zoneA: capacityA, zoneB: capacityB, delta: capacityA - capacityB },
    sla: { zoneA: slaA, zoneB: slaB, delta: slaA - slaB },
    risk: { zoneA: riskA, zoneB: riskB, delta: riskA - riskB },
  };

  return {
    zoneAId: zoneA.id,
    zoneBId: zoneB.id,
    metrics,
    overlapCellCount: sharedCells.length,
    overlapPct: Math.round(overlapPct * 10) / 10,
  };
}

/** Demand score: based on cell count (proxy for coverage area) */
function computeDemandScore(cells: H3CellState[]): number {
  return cells.length;
}

/** Capacity score: inverse of average risk (high risk = low capacity) */
function computeCapacityScore(cells: H3CellState[]): number {
  if (cells.length === 0) return 0;
  const avgRisk = cells.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / cells.length;
  return Math.max(0, 100 - avgRisk);
}

/** SLA score: based on confidence-weighted risk assessment */
function computeSlaScore(cells: H3CellState[]): number {
  if (cells.length === 0) return 0;
  const avgConfidence = cells.reduce((sum, c) => sum + c.confidence, 0) / cells.length;
  const avgRisk = cells.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / cells.length;
  return Math.round((1 - avgRisk / 100) * avgConfidence * 100);
}

/** Risk score: average effective risk across cells */
function computeRiskScore(cells: H3CellState[]): number {
  if (cells.length === 0) return 0;
  return Math.round(
    cells.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / cells.length
  );
}

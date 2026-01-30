/**
 * MetricsEngine.ts — Derives aggregate planning metrics from zones + cells.
 *
 * Pure computation. No side effects. No MapLibre.
 * Produces PlanningMetricsSummary from current state.
 */

import type { Zone } from '../contracts/Zone';
import type { H3CellState } from '../contracts/H3CellState';
import type { PlanningMetricsSummary } from '../contracts/PlanningTypes';

/**
 * Compute aggregate planning metrics from current zone + cell state.
 */
export function computePlanningMetrics(
  zones: Zone[],
  cellStates: H3CellState[]
): PlanningMetricsSummary {
  const totalCells = cellStates.length;

  if (totalCells === 0) {
    return {
      demandCoveredPct: 0,
      serviceGapPct: 100,
      slaImpactScore: 0,
      riskExposureScore: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Demand covered: cells that belong to at least one active zone
  const activeZoneIds = new Set(
    zones.filter((z) => z.status === 'active' || z.status === 'draft').map((z) => z.id)
  );
  const coveredCells = cellStates.filter((c) =>
    c.zoneIds.some((zid) => activeZoneIds.has(zid))
  );
  const demandCoveredPct = (coveredCells.length / totalCells) * 100;

  // Service gap: cells NOT covered by any zone
  const serviceGapPct = 100 - demandCoveredPct;

  // SLA impact: based on average risk of covered cells (lower risk = better SLA)
  const avgRisk = coveredCells.length > 0
    ? coveredCells.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / coveredCells.length
    : 0;
  // SLA impact score: inverse of risk (100 = perfect SLA, 0 = worst)
  const slaImpactScore = Math.max(0, 100 - avgRisk);

  // Risk exposure: average risk score across ALL cells
  const totalRisk = cellStates.reduce((sum, c) => sum + c.effectiveRiskScore, 0);
  const riskExposureScore = totalRisk / totalCells;

  return {
    demandCoveredPct: Math.round(demandCoveredPct * 10) / 10,
    serviceGapPct: Math.round(serviceGapPct * 10) / 10,
    slaImpactScore: Math.round(slaImpactScore * 10) / 10,
    riskExposureScore: Math.round(riskExposureScore * 10) / 10,
    lastUpdated: new Date().toISOString(),
  };
}

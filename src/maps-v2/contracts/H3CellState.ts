/**
 * H3CellState.ts — Derived spatial truth
 *
 * NEVER stored directly. Always computed by CellStateEngine.
 * Represents the resolved state of a single H3 cell based on
 * its zone memberships and applicable tags.
 */

export interface H3CellState {
  h3Index: string; // Resolution 7
  zoneIds: string[];
  flags: {
    hardToReach: boolean;
    securityThreat: boolean;
    restricted: boolean;
    floodRisk: boolean;
    conflictZone: boolean;
  };
  effectiveRiskScore: number; // 0–100 (max of severity * confidence * 20)
  confidence: number; // 0–1 (max confidence across active tags)
  derivedAt: string; // ISO 8601
}

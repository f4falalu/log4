/**
 * CellStateEngine.ts — Derives H3CellState from zones + tags.
 *
 * This is a pure computation engine.
 * Never stores derived state permanently.
 * Always reproducible from zone + tag inputs.
 */

import type { Zone, ZoneTag, H3CellState } from '../contracts';
import type { ZoneTagType } from '../contracts/ZoneTag';

const TAG_TO_FLAG: Record<ZoneTagType, keyof H3CellState['flags']> = {
  HARD_TO_REACH: 'hardToReach',
  SECURITY_THREAT: 'securityThreat',
  FLOOD_RISK: 'floodRisk',
  CONFLICT_ZONE: 'conflictZone',
  RESTRICTED_ACCESS: 'restricted',
};

export class CellStateEngine {
  private zones: Zone[] = [];
  private tags: ZoneTag[] = [];
  private cellToZones = new Map<string, string[]>();
  private zoneToTags = new Map<string, ZoneTag[]>();

  /**
   * Set zone data and rebuild cell index.
   */
  setZones(zones: Zone[]): void {
    this.zones = zones;
    this.rebuildCellIndex();
  }

  /**
   * Set tag data and rebuild zone-tag index.
   */
  setTags(tags: ZoneTag[]): void {
    this.tags = tags;
    this.rebuildTagIndex();
  }

  /**
   * Derive cell states for specific H3 indexes.
   */
  derive(h3Indexes: string[]): H3CellState[] {
    const now = new Date().toISOString();
    return h3Indexes.map((h3Index) => this.deriveSingle(h3Index, now));
  }

  /**
   * Derive cell states for ALL known cells (from all zones).
   */
  deriveAll(): H3CellState[] {
    const now = new Date().toISOString();
    const allCells = Array.from(this.cellToZones.keys());
    return allCells.map((h3Index) => this.deriveSingle(h3Index, now));
  }

  /**
   * Get zones that contain a specific cell.
   */
  getZonesForCell(h3Index: string): Zone[] {
    const zoneIds = this.cellToZones.get(h3Index) ?? [];
    return this.zones.filter((z) => zoneIds.includes(z.id));
  }

  private deriveSingle(h3Index: string, derivedAt: string): H3CellState {
    const zoneIds = this.cellToZones.get(h3Index) ?? [];

    // Collect all active tags for these zones
    const activeTags: ZoneTag[] = [];
    for (const zoneId of zoneIds) {
      const zoneTags = this.zoneToTags.get(zoneId) ?? [];
      for (const tag of zoneTags) {
        if (this.isTagActive(tag)) {
          activeTags.push(tag);
        }
      }
    }

    // Compute flags
    const flags: H3CellState['flags'] = {
      hardToReach: false,
      securityThreat: false,
      restricted: false,
      floodRisk: false,
      conflictZone: false,
    };

    let maxRiskScore = 0;
    let maxConfidence = 0;

    for (const tag of activeTags) {
      const flagKey = TAG_TO_FLAG[tag.type];
      if (flagKey) {
        flags[flagKey] = true;
      }

      // Risk score: severity (1-5) * confidence (0-1) * 20 → 0-100
      const risk = tag.severity * tag.confidence * 20;
      maxRiskScore = Math.max(maxRiskScore, risk);
      maxConfidence = Math.max(maxConfidence, tag.confidence);
    }

    return {
      h3Index,
      zoneIds,
      flags,
      effectiveRiskScore: Math.round(maxRiskScore),
      confidence: maxConfidence,
      derivedAt,
    };
  }

  private isTagActive(tag: ZoneTag): boolean {
    const now = new Date().toISOString();
    if (tag.validFrom > now) return false;
    if (tag.validTo && tag.validTo < now) return false;
    return true;
  }

  private rebuildCellIndex(): void {
    this.cellToZones.clear();
    for (const zone of this.zones) {
      if (zone.status === 'archived') continue;
      for (const h3Index of zone.h3Indexes) {
        const existing = this.cellToZones.get(h3Index) ?? [];
        existing.push(zone.id);
        this.cellToZones.set(h3Index, existing);
      }
    }
  }

  private rebuildTagIndex(): void {
    this.zoneToTags.clear();
    for (const tag of this.tags) {
      const existing = this.zoneToTags.get(tag.zoneId) ?? [];
      existing.push(tag);
      this.zoneToTags.set(tag.zoneId, existing);
    }
  }
}

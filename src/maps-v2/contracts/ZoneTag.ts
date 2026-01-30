/**
 * ZoneTag.ts — Semantic overlay for zones
 *
 * Tags are orthogonal to geometry.
 * Multiple tags may exist per zone.
 * Tags expire without deleting history.
 */

export type ZoneTagType =
  | 'HARD_TO_REACH'
  | 'SECURITY_THREAT'
  | 'FLOOD_RISK'
  | 'CONFLICT_ZONE'
  | 'RESTRICTED_ACCESS';

export interface ZoneTag {
  id: string;
  zoneId: string;
  type: ZoneTagType;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0.0 – 1.0
  validFrom: string; // ISO 8601
  validTo: string | null; // null = indefinite
  createdAt: string;
  createdBy: string;
}

export function createZoneTag(
  params: Pick<ZoneTag, 'zoneId' | 'type' | 'severity' | 'confidence' | 'validFrom' | 'validTo'> & { actorId: string }
): ZoneTag {
  return {
    id: crypto.randomUUID(),
    zoneId: params.zoneId,
    type: params.type,
    severity: params.severity,
    confidence: params.confidence,
    validFrom: params.validFrom,
    validTo: params.validTo,
    createdAt: new Date().toISOString(),
    createdBy: params.actorId,
  };
}

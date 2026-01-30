/**
 * AuditLog.ts — Mandatory mutation record
 *
 * Rule: If there is no AuditLog, the action is invalid.
 * Every zone/tag mutation produces exactly one entry.
 */

export type AuditAction =
  | 'ZONE_CREATED'
  | 'ZONE_UPDATED'
  | 'ZONE_ARCHIVED'
  | 'ZONE_TAG_ADDED'
  | 'ZONE_TAG_UPDATED'
  | 'ZONE_TAG_REMOVED';

export type AuditEntityType = 'ZONE' | 'ZONE_TAG';

export interface AuditLog {
  id: string;
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  timestamp: string; // ISO 8601
}

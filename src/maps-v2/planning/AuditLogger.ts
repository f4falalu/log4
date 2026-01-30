/**
 * AuditLogger.ts — Append-only audit log.
 *
 * Rule: If there is no AuditLog, the action is invalid.
 * Every mutation produces exactly one entry with before/after snapshots.
 */

import type { AuditLog, AuditAction, AuditEntityType } from '../contracts';

export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
}

export class AuditLogger {
  private log: AuditLog[] = [];

  /**
   * Append a new audit entry. Returns the full AuditLog record.
   */
  append(entry: AuditEntry): AuditLog {
    const record: AuditLog = {
      id: crypto.randomUUID(),
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
      timestamp: new Date().toISOString(),
    };

    this.log.push(record);
    return record;
  }

  /**
   * Get the full audit log.
   */
  getLog(): AuditLog[] {
    return [...this.log];
  }

  /**
   * Get audit entries for a specific entity.
   */
  getByEntity(entityType: AuditEntityType, entityId: string): AuditLog[] {
    return this.log.filter(
      (entry) => entry.entityType === entityType && entry.entityId === entityId
    );
  }

  /**
   * Get the most recent entries.
   */
  getRecent(count: number): AuditLog[] {
    return this.log.slice(-count);
  }

  /**
   * Get count of entries.
   */
  size(): number {
    return this.log.length;
  }
}

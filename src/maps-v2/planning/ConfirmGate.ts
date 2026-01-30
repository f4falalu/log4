/**
 * ConfirmGate.ts — Mandatory confirmation gate before any mutation.
 *
 * Flow:
 * 1. stage(mutation) — prepare a mutation for review
 * 2. User reviews the summary and provides a reason
 * 3. confirm(actorId, reason) — execute and produce AuditLog
 * 4. cancel() — discard mutation, return to IDLE
 *
 * No map interaction is allowed while a mutation is staged.
 */

import type { AuditLog } from '../contracts';
import { AuditLogger } from './AuditLogger';
import type { AuditEntry } from './AuditLogger';

export type MutationType =
  | 'CREATE_ZONE'
  | 'UPDATE_ZONE'
  | 'ARCHIVE_ZONE'
  | 'ADD_TAG'
  | 'REMOVE_TAG';

export interface PendingMutation {
  type: MutationType;
  description: string;
  payload: Record<string, unknown>;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type ConfirmCallback = (auditEntry: AuditLog) => void;
export type CancelCallback = () => void;

export class ConfirmGate {
  private pending: PendingMutation | null = null;
  private auditLogger: AuditLogger;
  private onConfirmCallback: ConfirmCallback | null = null;
  private onCancelCallback: CancelCallback | null = null;

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  /**
   * Stage a mutation for confirmation.
   */
  stage(
    mutation: PendingMutation,
    onConfirm?: ConfirmCallback,
    onCancel?: CancelCallback
  ): void {
    this.pending = mutation;
    this.onConfirmCallback = onConfirm ?? null;
    this.onCancelCallback = onCancel ?? null;
  }

  /**
   * Get the currently staged mutation (for UI review).
   */
  getPending(): PendingMutation | null {
    return this.pending;
  }

  /**
   * Is there a pending mutation?
   */
  hasPending(): boolean {
    return this.pending !== null;
  }

  /**
   * Confirm the staged mutation. Produces an AuditLog entry.
   */
  confirm(actorId: string, reason: string): AuditLog | null {
    if (!this.pending) return null;

    const mutation = this.pending;
    const auditEntry: AuditEntry = {
      actorId,
      action: this.mutationTypeToAction(mutation.type),
      entityType: mutation.type.includes('TAG') ? 'ZONE_TAG' : 'ZONE',
      entityId: (mutation.payload.entityId as string) ?? crypto.randomUUID(),
      before: mutation.before,
      after: mutation.after,
      reason,
    };

    const record = this.auditLogger.append(auditEntry);
    const callback = this.onConfirmCallback;

    this.clear();
    callback?.(record);

    return record;
  }

  /**
   * Cancel the staged mutation.
   */
  cancel(): void {
    const callback = this.onCancelCallback;
    this.clear();
    callback?.();
  }

  private clear(): void {
    this.pending = null;
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
  }

  private mutationTypeToAction(type: MutationType): AuditLog['action'] {
    switch (type) {
      case 'CREATE_ZONE': return 'ZONE_CREATED';
      case 'UPDATE_ZONE': return 'ZONE_UPDATED';
      case 'ARCHIVE_ZONE': return 'ZONE_ARCHIVED';
      case 'ADD_TAG': return 'ZONE_TAG_ADDED';
      case 'REMOVE_TAG': return 'ZONE_TAG_REMOVED';
    }
  }
}

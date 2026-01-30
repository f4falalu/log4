/**
 * =====================================================
 * REQUISITION STATE MACHINE
 * =====================================================
 *
 * Manages requisition status transitions.
 * Enforces valid state transitions with no bypasses.
 */

import type { Requisition, RequisitionStatus } from '@/types/requisitions';
import type { StateTransitionResult, ValidTransition } from './types';

/**
 * Valid state transitions.
 * Any transition not in this list is invalid.
 */
const VALID_TRANSITIONS: ValidTransition[] = [
  // Initial submission
  { from: 'pending', to: 'approved' },
  { from: 'pending', to: 'rejected' },
  { from: 'pending', to: 'cancelled' },

  // After approval
  { from: 'approved', to: 'packaged', requires: ['packaging'] },
  { from: 'approved', to: 'cancelled' },

  // After packaging
  { from: 'packaged', to: 'ready_for_dispatch' },
  { from: 'packaged', to: 'cancelled' },

  // Ready for dispatch
  { from: 'ready_for_dispatch', to: 'assigned_to_batch', requires: ['batch_id'] },
  { from: 'ready_for_dispatch', to: 'cancelled' },

  // Assigned to batch
  { from: 'assigned_to_batch', to: 'in_transit' },
  { from: 'assigned_to_batch', to: 'ready_for_dispatch' }, // Unassign

  // In transit
  { from: 'in_transit', to: 'fulfilled' },
  { from: 'in_transit', to: 'partially_delivered' },
  { from: 'in_transit', to: 'failed' },
];

/**
 * Check if a transition is valid.
 */
export function isValidTransition(
  fromStatus: RequisitionStatus,
  toStatus: RequisitionStatus
): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === fromStatus && t.to === toStatus
  );
}

/**
 * Get valid next states for a status.
 */
export function getValidNextStates(status: RequisitionStatus): RequisitionStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === status)
    .map((t) => t.to as RequisitionStatus);
}

/**
 * Get requirements for a transition.
 */
export function getTransitionRequirements(
  fromStatus: RequisitionStatus,
  toStatus: RequisitionStatus
): string[] {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === fromStatus && t.to === toStatus
  );
  return transition?.requires || [];
}

/**
 * Validate transition requirements.
 */
export function validateTransitionRequirements(
  requisition: Requisition,
  toStatus: RequisitionStatus
): { valid: boolean; missing: string[] } {
  const requirements = getTransitionRequirements(requisition.status, toStatus);
  const missing: string[] = [];

  for (const req of requirements) {
    switch (req) {
      case 'packaging':
        if (!requisition.packaging) {
          missing.push('Packaging must be computed');
        }
        break;
      case 'batch_id':
        if (!requisition.batch_id) {
          missing.push('Batch ID must be assigned');
        }
        break;
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Transition requisition to new status.
 * Returns updated requisition or error.
 */
export function transitionRequisition(
  requisition: Requisition,
  toStatus: RequisitionStatus,
  metadata?: Record<string, unknown>
): StateTransitionResult & { requisition?: Requisition } {
  const now = new Date().toISOString();

  // Validate transition is allowed
  if (!isValidTransition(requisition.status, toStatus)) {
    return {
      success: false,
      from_status: requisition.status,
      to_status: toStatus,
      error: `Invalid transition from '${requisition.status}' to '${toStatus}'`,
      timestamp: now,
    };
  }

  // Validate requirements
  const requirements = validateTransitionRequirements(requisition, toStatus);
  if (!requirements.valid) {
    return {
      success: false,
      from_status: requisition.status,
      to_status: toStatus,
      error: `Missing requirements: ${requirements.missing.join(', ')}`,
      timestamp: now,
    };
  }

  // Build updated requisition
  const updated: Requisition = {
    ...requisition,
    status: toStatus,
    updated_at: now,
  };

  // Update timestamp fields based on transition
  switch (toStatus) {
    case 'approved':
      updated.approved_at = now;
      if (metadata?.approved_by) {
        updated.approved_by = metadata.approved_by as string;
      }
      break;
    case 'packaged':
      updated.packaged_at = now;
      break;
    case 'ready_for_dispatch':
      updated.ready_for_dispatch_at = now;
      break;
    case 'assigned_to_batch':
      updated.assigned_to_batch_at = now;
      if (metadata?.batch_id) {
        updated.batch_id = metadata.batch_id as string;
      }
      break;
    case 'in_transit':
      updated.in_transit_at = now;
      break;
    case 'fulfilled':
    case 'partially_delivered':
      updated.fulfilled_at = now;
      updated.delivered_at = now;
      break;
    case 'rejected':
      if (metadata?.rejection_reason) {
        updated.rejection_reason = metadata.rejection_reason as string;
      }
      break;
  }

  return {
    success: true,
    from_status: requisition.status,
    to_status: toStatus,
    timestamp: now,
    requisition: updated,
  };
}

/**
 * Check if requisition is in terminal state.
 */
export function isTerminalState(status: RequisitionStatus): boolean {
  return ['fulfilled', 'partially_delivered', 'failed', 'rejected', 'cancelled'].includes(status);
}

/**
 * Check if requisition can be cancelled.
 */
export function canCancel(status: RequisitionStatus): boolean {
  return ['pending', 'approved', 'packaged', 'ready_for_dispatch'].includes(status);
}

/**
 * Check if requisition is ready for batching.
 */
export function isReadyForBatching(requisition: Requisition): boolean {
  return (
    requisition.status === 'ready_for_dispatch' &&
    !!requisition.packaging &&
    requisition.packaging.is_final &&
    !requisition.batch_id
  );
}

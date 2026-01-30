/**
 * =====================================================
 * READINESS VALIDATOR
 * =====================================================
 *
 * Validates requisition readiness for dispatch.
 * Only READY_FOR_DISPATCH requisitions can be batched.
 *
 * IMPORTANT: No bypasses or "proceed anyway" logic.
 */

import type { Requisition, RequisitionStatus } from '@/types/requisitions';
import type { ReadinessStatus, ReadinessValidation, FacilityReadiness } from './types';

/**
 * Map requisition status to readiness status.
 */
export function mapToReadinessStatus(status: RequisitionStatus): ReadinessStatus {
  switch (status) {
    case 'ready_for_dispatch':
      return 'ready_for_dispatch';
    case 'packaged':
      return 'pending_packaging'; // Still in packaging workflow
    case 'approved':
      return 'pending_packaging';
    case 'pending':
      return 'pending_approval';
    default:
      return 'not_ready';
  }
}

/**
 * Validate a single requisition's readiness.
 * Returns explicit blocking reasons if not ready.
 */
export function validateRequisitionReadiness(
  requisition: Requisition
): ReadinessValidation {
  const blockingReasons: string[] = [];

  // Check status
  if (requisition.status !== 'ready_for_dispatch') {
    blockingReasons.push(
      `Requisition status is '${requisition.status}', must be 'ready_for_dispatch'`
    );
  }

  // Check packaging exists
  if (!requisition.packaging) {
    blockingReasons.push('Requisition has no packaging computed');
  }

  // Check packaging is finalized
  if (requisition.packaging && !requisition.packaging.is_final) {
    blockingReasons.push('Packaging is not finalized');
  }

  // Check already assigned to batch
  if (requisition.batch_id) {
    blockingReasons.push(`Requisition already assigned to batch ${requisition.batch_id}`);
  }

  // Check cancelled/rejected
  if (requisition.status === 'cancelled') {
    blockingReasons.push('Requisition is cancelled');
  }

  if (requisition.status === 'rejected') {
    blockingReasons.push('Requisition is rejected');
  }

  return {
    valid: blockingReasons.length === 0,
    requisition_id: requisition.id,
    status: mapToReadinessStatus(requisition.status),
    blocking_reasons: blockingReasons,
    can_proceed: blockingReasons.length === 0,
  };
}

/**
 * Validate multiple requisitions for batching.
 * All must be ready or the entire operation is blocked.
 */
export function validateRequisitionsForBatching(
  requisitions: Requisition[]
): {
  valid: boolean;
  validations: ReadinessValidation[];
  summary: {
    total: number;
    ready: number;
    blocked: number;
  };
} {
  const validations = requisitions.map(validateRequisitionReadiness);

  const ready = validations.filter((v) => v.valid).length;
  const blocked = validations.filter((v) => !v.valid).length;

  return {
    valid: blocked === 0,
    validations,
    summary: {
      total: requisitions.length,
      ready,
      blocked,
    },
  };
}

/**
 * Get facility readiness from its requisitions.
 */
export function getFacilityReadiness(
  facilityId: string,
  facilityName: string,
  requisitions: Requisition[]
): FacilityReadiness {
  const facilityRequisitions = requisitions.filter(
    (r) => r.facility_id === facilityId
  );

  const readyRequisitions = facilityRequisitions.filter(
    (r) => r.status === 'ready_for_dispatch'
  );

  const pendingRequisitions = facilityRequisitions.filter(
    (r) => r.status === 'pending' || r.status === 'approved' || r.status === 'packaged'
  );

  // Calculate total slot demand from packaging
  const totalSlotDemand = readyRequisitions.reduce(
    (sum, r) => sum + (r.packaging?.rounded_slot_demand || 0),
    0
  );

  // Determine overall status
  let status: ReadinessStatus = 'not_ready';
  const blockingReasons: string[] = [];

  if (facilityRequisitions.length === 0) {
    blockingReasons.push('No requisitions for this facility');
  } else if (readyRequisitions.length === facilityRequisitions.length) {
    status = 'ready_for_dispatch';
  } else if (readyRequisitions.length > 0) {
    status = 'ready_for_dispatch'; // Partial readiness is OK
    if (pendingRequisitions.length > 0) {
      blockingReasons.push(`${pendingRequisitions.length} requisitions still pending`);
    }
  } else if (pendingRequisitions.length > 0) {
    status = 'pending_packaging';
    blockingReasons.push('All requisitions pending packaging/approval');
  }

  return {
    facility_id: facilityId,
    facility_name: facilityName,
    requisition_count: facilityRequisitions.length,
    ready_requisitions: readyRequisitions.length,
    pending_requisitions: pendingRequisitions.length,
    total_slot_demand: totalSlotDemand,
    status,
    blocking_reasons: blockingReasons,
  };
}

/**
 * Filter requisitions to only those ready for dispatch.
 * No bypasses - strict filtering.
 */
export function filterReadyRequisitions(requisitions: Requisition[]): Requisition[] {
  return requisitions.filter((r) => {
    const validation = validateRequisitionReadiness(r);
    return validation.valid;
  });
}

/**
 * Assert requisition is ready for batching.
 * Throws if not ready (no silent failures).
 */
export function assertRequisitionReady(requisition: Requisition): void {
  const validation = validateRequisitionReadiness(requisition);

  if (!validation.valid) {
    throw new RequisitionNotReadyError(
      `Requisition ${requisition.id} is not ready for batching`,
      validation.blocking_reasons
    );
  }
}

/**
 * Error class for requisition readiness failures.
 */
export class RequisitionNotReadyError extends Error {
  public readonly blockingReasons: string[];

  constructor(message: string, blockingReasons: string[]) {
    super(message);
    this.name = 'RequisitionNotReadyError';
    this.blockingReasons = blockingReasons;
  }
}

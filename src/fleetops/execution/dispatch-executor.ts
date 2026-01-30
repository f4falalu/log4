/**
 * =====================================================
 * DISPATCH EXECUTOR
 * =====================================================
 *
 * Manages dispatch execution workflow.
 */

import type {
  DispatchExecution,
  FacilityDelivery,
  ProofOfDelivery,
  ExecutionEvent,
  DispatchRequest,
  DeliveryUpdateRequest,
  ExecutionStatus,
  DeliveryStatus,
} from './types';
import type { ExecutablePlan } from '@/fleetops/planner';

/**
 * Create dispatch execution from plan.
 */
export function createDispatchExecution(
  plan: ExecutablePlan,
  request: DispatchRequest
): DispatchExecution {
  const now = new Date().toISOString();

  return {
    id: generateExecutionId(),
    plan_id: plan.plan_id,
    batch_id: plan.batch_id,
    vehicle_id: plan.vehicle_assignment.vehicle_id,
    driver_id: request.driver_id,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Create facility deliveries from plan.
 */
export function createFacilityDeliveries(
  executionId: string,
  plan: ExecutablePlan
): FacilityDelivery[] {
  const now = new Date().toISOString();

  return plan.route.points.map((point) => ({
    id: generateDeliveryId(),
    execution_id: executionId,
    facility_id: point.facility_id,
    sequence: point.sequence,
    status: 'pending' as DeliveryStatus,
    scheduled_arrival: point.eta,
    pod_collected: false,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * Start dispatch execution.
 */
export function startDispatch(
  execution: DispatchExecution
): DispatchExecution | { error: string } {
  if (execution.status !== 'pending') {
    return { error: `Cannot start dispatch from status '${execution.status}'` };
  }

  const now = new Date().toISOString();

  return {
    ...execution,
    status: 'dispatched',
    dispatched_at: now,
    updated_at: now,
  };
}

/**
 * Mark execution as in transit.
 */
export function markInTransit(
  execution: DispatchExecution
): DispatchExecution | { error: string } {
  if (execution.status !== 'dispatched') {
    return { error: `Cannot start transit from status '${execution.status}'` };
  }

  const now = new Date().toISOString();

  return {
    ...execution,
    status: 'in_transit',
    started_at: now,
    updated_at: now,
  };
}

/**
 * Update facility delivery status.
 */
export function updateDeliveryStatus(
  delivery: FacilityDelivery,
  request: DeliveryUpdateRequest
): FacilityDelivery | { error: string } {
  const validTransitions = getValidDeliveryTransitions(delivery.status);

  if (!validTransitions.includes(request.status)) {
    return {
      error: `Cannot transition from '${delivery.status}' to '${request.status}'`,
    };
  }

  const now = new Date().toISOString();
  const updated: FacilityDelivery = {
    ...delivery,
    status: request.status,
    notes: request.notes || delivery.notes,
    updated_at: now,
  };

  // Set timestamps based on status
  if (request.status === 'arrived') {
    updated.actual_arrival = now;
  } else if (request.status === 'delivered') {
    updated.departure_time = now;
  }

  // Mark PoD collected if provided
  if (request.pod) {
    updated.pod_collected = true;
  }

  return updated;
}

/**
 * Create proof of delivery record.
 */
export function createProofOfDelivery(
  facilityDeliveryId: string,
  collectedBy: string,
  data: {
    signature_url?: string;
    photo_urls?: string[];
    recipient_name?: string;
    recipient_title?: string;
    notes?: string;
    location_lat?: number;
    location_lng?: number;
  }
): ProofOfDelivery {
  return {
    id: generatePodId(),
    facility_delivery_id: facilityDeliveryId,
    signature_url: data.signature_url,
    photo_urls: data.photo_urls,
    recipient_name: data.recipient_name,
    recipient_title: data.recipient_title,
    notes: data.notes,
    location_lat: data.location_lat,
    location_lng: data.location_lng,
    collected_at: new Date().toISOString(),
    collected_by: collectedBy,
  };
}

/**
 * Complete execution.
 */
export function completeExecution(
  execution: DispatchExecution,
  deliveries: FacilityDelivery[]
): DispatchExecution | { error: string } {
  // Check all deliveries are complete
  const incomplete = deliveries.filter(
    (d) => d.status !== 'delivered' && d.status !== 'skipped' && d.status !== 'failed'
  );

  if (incomplete.length > 0) {
    return {
      error: `Cannot complete execution: ${incomplete.length} deliveries still pending`,
    };
  }

  const now = new Date().toISOString();

  // Check if any failed
  const failed = deliveries.filter((d) => d.status === 'failed');
  const status: ExecutionStatus = failed.length > 0 ? 'failed' : 'completed';

  return {
    ...execution,
    status,
    completed_at: now,
    updated_at: now,
  };
}

/**
 * Create execution event.
 */
export function createExecutionEvent(
  executionId: string,
  eventType: ExecutionEvent['event_type'],
  createdBy: string,
  data?: {
    previous_value?: string;
    new_value?: string;
    location_lat?: number;
    location_lng?: number;
    notes?: string;
  }
): ExecutionEvent {
  return {
    id: generateEventId(),
    execution_id: executionId,
    event_type: eventType,
    previous_value: data?.previous_value,
    new_value: data?.new_value,
    location_lat: data?.location_lat,
    location_lng: data?.location_lng,
    notes: data?.notes,
    created_at: new Date().toISOString(),
    created_by: createdBy,
  };
}

/**
 * Get execution summary.
 */
export function getExecutionSummary(
  execution: DispatchExecution,
  deliveries: FacilityDelivery[]
): {
  total_facilities: number;
  delivered: number;
  failed: number;
  skipped: number;
  pending: number;
  pod_collected: number;
  completion_pct: number;
} {
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;
  const failed = deliveries.filter((d) => d.status === 'failed').length;
  const skipped = deliveries.filter((d) => d.status === 'skipped').length;
  const pending = deliveries.filter(
    (d) => !['delivered', 'failed', 'skipped'].includes(d.status)
  ).length;
  const podCollected = deliveries.filter((d) => d.pod_collected).length;

  const total = deliveries.length;
  const completed = delivered + failed + skipped;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total_facilities: total,
    delivered,
    failed,
    skipped,
    pending,
    pod_collected: podCollected,
    completion_pct: completionPct,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getValidDeliveryTransitions(currentStatus: DeliveryStatus): DeliveryStatus[] {
  const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ['en_route', 'skipped'],
    en_route: ['arrived', 'skipped'],
    arrived: ['delivering', 'skipped', 'failed'],
    delivering: ['delivered', 'failed'],
    delivered: [],
    failed: [],
    skipped: [],
  };

  return transitions[currentStatus] || [];
}

function generateExecutionId(): string {
  return `EXEC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateDeliveryId(): string {
  return `DEL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generatePodId(): string {
  return `POD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateEventId(): string {
  return `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

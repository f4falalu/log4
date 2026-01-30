/**
 * =====================================================
 * FLEETOPS EXECUTION TYPES
 * =====================================================
 *
 * Types for dispatch execution and delivery tracking.
 */

/**
 * Dispatch execution status.
 */
export type ExecutionStatus =
  | 'pending'
  | 'dispatched'
  | 'in_transit'
  | 'at_facility'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Delivery status for a single facility.
 */
export type DeliveryStatus =
  | 'pending'
  | 'en_route'
  | 'arrived'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'skipped';

/**
 * Dispatch execution record.
 */
export interface DispatchExecution {
  id: string;
  plan_id: string;
  batch_id: string;
  vehicle_id: string;
  driver_id: string;
  status: ExecutionStatus;
  dispatched_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Facility delivery record.
 */
export interface FacilityDelivery {
  id: string;
  execution_id: string;
  facility_id: string;
  sequence: number;
  status: DeliveryStatus;
  scheduled_arrival?: string;
  actual_arrival?: string;
  departure_time?: string;
  pod_collected: boolean;
  pod_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Proof of Delivery record.
 */
export interface ProofOfDelivery {
  id: string;
  facility_delivery_id: string;
  signature_url?: string;
  photo_urls?: string[];
  recipient_name?: string;
  recipient_title?: string;
  notes?: string;
  location_lat?: number;
  location_lng?: number;
  collected_at: string;
  collected_by: string;
}

/**
 * Execution event for tracking.
 */
export interface ExecutionEvent {
  id: string;
  execution_id: string;
  event_type: 'status_change' | 'location_update' | 'delivery_complete' | 'issue_reported';
  previous_value?: string;
  new_value?: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  created_at: string;
  created_by: string;
}

/**
 * Dispatch request.
 */
export interface DispatchRequest {
  plan_id: string;
  driver_id: string;
  dispatch_immediately?: boolean;
  scheduled_dispatch_time?: string;
}

/**
 * Delivery update request.
 */
export interface DeliveryUpdateRequest {
  facility_delivery_id: string;
  status: DeliveryStatus;
  notes?: string;
  pod?: {
    signature_url?: string;
    photo_urls?: string[];
    recipient_name?: string;
    recipient_title?: string;
  };
}

/**
 * =====================================================
 * STOREFRONT PLANNER TYPES
 * =====================================================
 *
 * Types for facility planning and readiness validation.
 */

/**
 * Readiness status for a requisition.
 */
export type ReadinessStatus =
  | 'not_ready'
  | 'pending_approval'
  | 'pending_packaging'
  | 'ready_for_dispatch';

/**
 * Facility readiness info.
 */
export interface FacilityReadiness {
  facility_id: string;
  facility_name: string;
  requisition_count: number;
  ready_requisitions: number;
  pending_requisitions: number;
  total_slot_demand: number;
  status: ReadinessStatus;
  blocking_reasons: string[];
}

/**
 * Batch candidate - a facility ready for batching.
 */
export interface BatchCandidate {
  facility_id: string;
  facility_name: string;
  warehouse_id: string;
  requisition_ids: string[];
  total_slot_demand: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requested_date?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Selection criteria for batch candidates.
 */
export interface CandidateSelectionCriteria {
  warehouse_id?: string;
  min_priority?: 'low' | 'medium' | 'high' | 'urgent';
  date_range?: {
    from: string;
    to: string;
  };
  zone_ids?: string[];
  max_candidates?: number;
}

/**
 * Readiness validation result.
 */
export interface ReadinessValidation {
  valid: boolean;
  requisition_id: string;
  status: ReadinessStatus;
  blocking_reasons: string[];
  can_proceed: boolean;
}

/**
 * Planning session state.
 */
export interface PlanningSession {
  id: string;
  warehouse_id: string;
  planned_date: string;
  selected_candidates: BatchCandidate[];
  total_slot_demand: number;
  created_at: string;
  updated_at: string;
}

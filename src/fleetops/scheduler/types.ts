/**
 * =====================================================
 * FLEETOPS SCHEDULER TYPES
 * =====================================================
 *
 * Types for scheduling operations.
 * Scheduler outputs execution metadata, not batch modifications.
 */

/**
 * Time window for delivery scheduling.
 */
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'all_day';

/**
 * Time window configuration.
 */
export interface TimeWindowConfig {
  morning: { start: string; end: string };   // e.g., "06:00" - "12:00"
  afternoon: { start: string; end: string }; // e.g., "12:00" - "18:00"
  evening: { start: string; end: string };   // e.g., "18:00" - "22:00"
  all_day: { start: string; end: string };   // e.g., "06:00" - "22:00"
}

/**
 * Input contract from Storefront batch.
 * This is what Scheduler receives - treat as IMMUTABLE.
 */
export interface SchedulerInputContract {
  batch_id: string;
  vehicle_id: string;
  route_id?: string;
  slot_snapshot: {
    total_slot_demand: number;
    facility_demands: Array<{
      facility_id: string;
      slot_demand: number;
    }>;
  };
  facilities: string[];
  planned_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Execution metadata output from Scheduler.
 */
export interface SchedulerOutput {
  batch_id: string;
  vehicle_id: string;
  driver_id?: string;

  // Time windows
  scheduled_date: string;
  time_window: TimeWindow;
  dispatch_time: string;
  estimated_completion_time: string;

  // Facility-level ETAs
  facility_etas: FacilityETA[];

  // Metadata
  created_at: string;
  created_by?: string;
}

/**
 * ETA for a single facility.
 */
export interface FacilityETA {
  facility_id: string;
  sequence: number;
  estimated_arrival: string;
  estimated_departure: string;
  time_window?: TimeWindow;
}

/**
 * Dispatch window configuration.
 */
export interface DispatchWindow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  max_batches: number;
  current_batches: number;
  available: boolean;
}

/**
 * Scheduling request.
 */
export interface ScheduleRequest {
  batch_id: string;
  vehicle_id: string;
  driver_id?: string;
  time_window: TimeWindow;
  dispatch_time?: string; // If not provided, calculated from time_window
}

/**
 * Scheduling result.
 */
export interface ScheduleResult {
  success: boolean;
  output?: SchedulerOutput;
  errors: string[];
  warnings: string[];
}

/**
 * Dispatch status.
 */
export type DispatchStatus =
  | 'scheduled'
  | 'dispatched'
  | 'in_transit'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Dispatch record.
 */
export interface DispatchRecord {
  id: string;
  batch_id: string;
  vehicle_id: string;
  driver_id: string;
  status: DispatchStatus;
  scheduled_dispatch_time: string;
  actual_dispatch_time?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

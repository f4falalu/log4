/**
 * =====================================================
 * DISPATCH SCHEDULER
 * =====================================================
 *
 * Schedules batch dispatch operations.
 * Generates execution metadata without modifying batch.
 *
 * IMPORTANT: Batch input is treated as IMMUTABLE.
 */

import type {
  SchedulerInputContract,
  SchedulerOutput,
  ScheduleRequest,
  ScheduleResult,
  DispatchWindow,
} from './types';
import {
  calculateDispatchTime,
  calculateEstimatedCompletion,
  generateFacilityETAs,
} from './time-window-assigner';

/**
 * Schedule a batch for dispatch.
 * Generates execution metadata without modifying batch.
 */
export function scheduleBatch(
  input: SchedulerInputContract,
  request: ScheduleRequest
): ScheduleResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate input contract
  if (!input.batch_id) {
    errors.push('Missing batch_id in input contract');
  }

  if (!input.vehicle_id && !request.vehicle_id) {
    errors.push('No vehicle assigned');
  }

  if (input.facilities.length === 0) {
    errors.push('Batch has no facilities');
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  // Calculate dispatch time
  const dispatchTime = request.dispatch_time ||
    calculateDispatchTime(input.planned_date, request.time_window);

  // Calculate estimated completion
  const estimatedCompletion = calculateEstimatedCompletion(
    dispatchTime,
    input.facilities.length
  );

  // Generate facility ETAs
  const facilityEtas = generateFacilityETAs(input, dispatchTime);

  // Build output
  const output: SchedulerOutput = {
    batch_id: input.batch_id,
    vehicle_id: request.vehicle_id || input.vehicle_id,
    driver_id: request.driver_id,
    scheduled_date: input.planned_date,
    time_window: request.time_window,
    dispatch_time: dispatchTime,
    estimated_completion_time: estimatedCompletion,
    facility_etas: facilityEtas,
    created_at: new Date().toISOString(),
  };

  // Add warnings for high slot utilization
  if (input.slot_snapshot.total_slot_demand > 0) {
    const totalFacilities = input.facilities.length;
    if (totalFacilities > 10) {
      warnings.push(`Large batch with ${totalFacilities} facilities - consider splitting`);
    }
  }

  return {
    success: true,
    output,
    errors: [],
    warnings,
  };
}

/**
 * Get available dispatch windows for a date.
 */
export function getDispatchWindows(
  date: string,
  existingSchedules: SchedulerOutput[] = [],
  maxBatchesPerWindow: number = 5
): DispatchWindow[] {
  const windows: DispatchWindow[] = [
    {
      id: `${date}-morning`,
      name: 'Morning (6AM - 12PM)',
      start_time: '06:00',
      end_time: '12:00',
      max_batches: maxBatchesPerWindow,
      current_batches: 0,
      available: true,
    },
    {
      id: `${date}-afternoon`,
      name: 'Afternoon (12PM - 6PM)',
      start_time: '12:00',
      end_time: '18:00',
      max_batches: maxBatchesPerWindow,
      current_batches: 0,
      available: true,
    },
    {
      id: `${date}-evening`,
      name: 'Evening (6PM - 10PM)',
      start_time: '18:00',
      end_time: '22:00',
      max_batches: maxBatchesPerWindow,
      current_batches: 0,
      available: true,
    },
  ];

  // Count existing schedules per window
  for (const schedule of existingSchedules) {
    if (schedule.scheduled_date !== date) continue;

    const window = windows.find((w) => w.start_time <= schedule.dispatch_time.slice(11, 16) &&
      w.end_time > schedule.dispatch_time.slice(11, 16));

    if (window) {
      window.current_batches++;
      if (window.current_batches >= window.max_batches) {
        window.available = false;
      }
    }
  }

  return windows;
}

/**
 * Check if a vehicle is available for a time slot.
 */
export function isVehicleAvailable(
  vehicleId: string,
  dispatchTime: string,
  estimatedDurationMinutes: number,
  existingSchedules: SchedulerOutput[]
): boolean {
  const dispatchStart = new Date(dispatchTime);
  const dispatchEnd = new Date(dispatchStart.getTime() + estimatedDurationMinutes * 60 * 1000);

  for (const schedule of existingSchedules) {
    if (schedule.vehicle_id !== vehicleId) continue;

    const scheduleStart = new Date(schedule.dispatch_time);
    const scheduleEnd = new Date(schedule.estimated_completion_time);

    // Check for overlap
    if (dispatchStart < scheduleEnd && dispatchEnd > scheduleStart) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a driver is available for a time slot.
 */
export function isDriverAvailable(
  driverId: string,
  dispatchTime: string,
  estimatedDurationMinutes: number,
  existingSchedules: SchedulerOutput[]
): boolean {
  const dispatchStart = new Date(dispatchTime);
  const dispatchEnd = new Date(dispatchStart.getTime() + estimatedDurationMinutes * 60 * 1000);

  for (const schedule of existingSchedules) {
    if (schedule.driver_id !== driverId) continue;

    const scheduleStart = new Date(schedule.dispatch_time);
    const scheduleEnd = new Date(schedule.estimated_completion_time);

    // Check for overlap
    if (dispatchStart < scheduleEnd && dispatchEnd > scheduleStart) {
      return false;
    }
  }

  return true;
}

/**
 * Validate schedule request.
 */
export function validateScheduleRequest(
  input: SchedulerInputContract,
  request: ScheduleRequest,
  existingSchedules: SchedulerOutput[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate vehicle availability
  const dispatchTime = request.dispatch_time ||
    calculateDispatchTime(input.planned_date, request.time_window);

  const estimatedDuration = input.facilities.length * 35; // 20min service + 15min travel

  if (!isVehicleAvailable(
    request.vehicle_id,
    dispatchTime,
    estimatedDuration,
    existingSchedules
  )) {
    errors.push(`Vehicle ${request.vehicle_id} is not available for this time slot`);
  }

  // Validate driver availability (if assigned)
  if (request.driver_id) {
    if (!isDriverAvailable(
      request.driver_id,
      dispatchTime,
      estimatedDuration,
      existingSchedules
    )) {
      errors.push(`Driver ${request.driver_id} is not available for this time slot`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

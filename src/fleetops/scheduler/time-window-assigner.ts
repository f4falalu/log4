/**
 * =====================================================
 * TIME WINDOW ASSIGNER
 * =====================================================
 *
 * Assigns time windows to batches.
 * Does NOT modify batch data - only generates scheduling metadata.
 */

import type {
  TimeWindow,
  TimeWindowConfig,
  FacilityETA,
  SchedulerInputContract,
} from './types';

/**
 * Default time window configuration.
 */
export const DEFAULT_TIME_WINDOWS: TimeWindowConfig = {
  morning: { start: '06:00', end: '12:00' },
  afternoon: { start: '12:00', end: '18:00' },
  evening: { start: '18:00', end: '22:00' },
  all_day: { start: '06:00', end: '22:00' },
};

/**
 * Get start time for a time window.
 */
export function getTimeWindowStart(
  timeWindow: TimeWindow,
  config: TimeWindowConfig = DEFAULT_TIME_WINDOWS
): string {
  return config[timeWindow].start;
}

/**
 * Get end time for a time window.
 */
export function getTimeWindowEnd(
  timeWindow: TimeWindow,
  config: TimeWindowConfig = DEFAULT_TIME_WINDOWS
): string {
  return config[timeWindow].end;
}

/**
 * Calculate dispatch time based on time window.
 */
export function calculateDispatchTime(
  plannedDate: string,
  timeWindow: TimeWindow,
  config: TimeWindowConfig = DEFAULT_TIME_WINDOWS
): string {
  const startTime = getTimeWindowStart(timeWindow, config);
  return `${plannedDate}T${startTime}:00`;
}

/**
 * Calculate estimated completion time.
 * Based on number of facilities and average service time.
 */
export function calculateEstimatedCompletion(
  dispatchTime: string,
  facilityCount: number,
  avgServiceTimeMinutes: number = 20,
  avgTravelTimeMinutes: number = 15
): string {
  const dispatch = new Date(dispatchTime);

  // Total time = facilities * (service + travel)
  const totalMinutes = facilityCount * (avgServiceTimeMinutes + avgTravelTimeMinutes);

  const completion = new Date(dispatch.getTime() + totalMinutes * 60 * 1000);

  return completion.toISOString();
}

/**
 * Generate facility ETAs based on sequence.
 */
export function generateFacilityETAs(
  input: SchedulerInputContract,
  dispatchTime: string,
  avgServiceTimeMinutes: number = 20,
  avgTravelTimeMinutes: number = 15
): FacilityETA[] {
  const etas: FacilityETA[] = [];
  let currentTime = new Date(dispatchTime);

  for (let i = 0; i < input.facilities.length; i++) {
    const facilityId = input.facilities[i];

    // Travel time to facility (except for first)
    if (i > 0) {
      currentTime = new Date(currentTime.getTime() + avgTravelTimeMinutes * 60 * 1000);
    }

    const arrivalTime = currentTime.toISOString();

    // Service time at facility
    const departureTime = new Date(
      currentTime.getTime() + avgServiceTimeMinutes * 60 * 1000
    ).toISOString();

    etas.push({
      facility_id: facilityId,
      sequence: i + 1,
      estimated_arrival: arrivalTime,
      estimated_departure: departureTime,
    });

    currentTime = new Date(departureTime);
  }

  return etas;
}

/**
 * Check if a time window is valid for a given date.
 */
export function isTimeWindowValid(
  plannedDate: string,
  timeWindow: TimeWindow,
  config: TimeWindowConfig = DEFAULT_TIME_WINDOWS
): boolean {
  const now = new Date();
  const dispatchTime = new Date(calculateDispatchTime(plannedDate, timeWindow, config));

  // Cannot schedule in the past
  if (dispatchTime < now) {
    return false;
  }

  return true;
}

/**
 * Get available time windows for a date.
 */
export function getAvailableTimeWindows(
  plannedDate: string,
  config: TimeWindowConfig = DEFAULT_TIME_WINDOWS
): TimeWindow[] {
  const windows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'all_day'];

  return windows.filter((window) => isTimeWindowValid(plannedDate, window, config));
}

/**
 * Suggest best time window based on priority.
 */
export function suggestTimeWindow(
  priority: 'low' | 'medium' | 'high' | 'urgent',
  plannedDate: string
): TimeWindow {
  const available = getAvailableTimeWindows(plannedDate);

  if (available.length === 0) {
    throw new Error(`No available time windows for date ${plannedDate}`);
  }

  // Urgent/high priority -> morning (earliest dispatch)
  // Medium -> afternoon
  // Low -> all_day (most flexible)
  switch (priority) {
    case 'urgent':
    case 'high':
      return available.includes('morning') ? 'morning' : available[0];
    case 'medium':
      return available.includes('afternoon') ? 'afternoon' : available[0];
    case 'low':
    default:
      return available.includes('all_day') ? 'all_day' : available[available.length - 1];
  }
}

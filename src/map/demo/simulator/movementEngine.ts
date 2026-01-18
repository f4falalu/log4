/**
 * Movement Engine
 *
 * Core vehicle simulation logic
 * Advances vehicles along routes with realistic speed variation
 */

import { computeSpeedKmh } from './speedModel';
import { haversineMeters, interpolatePoint, calculateBearing } from './geoUtils';

export interface ActiveEvent {
  type: 'delay';
  reason: 'traffic_jam' | 'road_obstruction' | 'vehicle_breakdown' | 'fuel_stop';
  durationMin: number;
  startTime: Date;
  endTime: Date;
  speedMultiplier: number; // 0 = stopped, 1 = normal speed
}

export interface DeliveryStop {
  waypointIndex: number;
  facilityId: string;
  arrivedAt: Date | null;
  departedAt: Date | null;
  dwellMinutes: number;
  slotsDelivered: number;
}

export interface VehicleSimState {
  vehicleId: string;
  route: [number, number][];
  segmentIndex: number;
  progress: number; // 0-1 within current segment
  position: [number, number];
  bearing: number;
  baseSpeedKmh: number;
  currentSpeedKmh: number;
  isComplete: boolean;
  activeEvents: ActiveEvent[]; // Events affecting movement
  waypoints?: { position: [number, number]; polylineIndex: number; dwellMinutes: number; slotsToDeliver: number; facilityId: string }[]; // Delivery waypoints
  deliveryStops: DeliveryStop[]; // Track delivery progress
  currentCapacity: number; // Current load (decreases on delivery)
  isDwelling: boolean; // True when at a delivery stop
}

export interface AdvanceParams {
  state: VehicleSimState;
  deltaSeconds: number;
  timestamp: Date;
  rng: () => number;
}

/**
 * Clean up expired events
 * Returns filtered array of still-active events
 */
function cleanExpiredEvents(events: ActiveEvent[], currentTime: Date): ActiveEvent[] {
  return events.filter(event => currentTime < event.endTime);
}

/**
 * Calculate composite speed multiplier from all active events
 * Returns the most restrictive multiplier (minimum)
 */
function calculateEventSpeedMultiplier(events: ActiveEvent[]): number {
  if (events.length === 0) return 1.0;

  // Return the most restrictive speed multiplier
  return Math.min(...events.map(e => e.speedMultiplier));
}

/**
 * Check if vehicle is at a waypoint (within proximity threshold)
 */
function checkWaypointArrival(
  state: VehicleSimState,
  timestamp: Date
): VehicleSimState | null {
  if (!state.waypoints || state.waypoints.length === 0) return null;

  // Check if current segment index matches any waypoint
  for (let i = 0; i < state.waypoints.length; i++) {
    const waypoint = state.waypoints[i];
    const deliveryStop = state.deliveryStops[i];

    // Skip if already departed from this waypoint
    if (deliveryStop && deliveryStop.departedAt) continue;

    // Check if we're at this waypoint's polyline index
    if (state.segmentIndex === waypoint.polylineIndex) {
      // Mark arrival if not already arrived
      if (!deliveryStop || !deliveryStop.arrivedAt) {
        return {
          ...state,
          isDwelling: true,
          deliveryStops: state.deliveryStops.map((stop, idx) =>
            idx === i
              ? { ...stop, arrivedAt: timestamp }
              : stop
          ),
        };
      }

      // Check if dwell time has elapsed
      const dwellElapsed =
        (timestamp.getTime() - deliveryStop.arrivedAt!.getTime()) / 1000 / 60; // minutes

      if (dwellElapsed >= waypoint.dwellMinutes) {
        // Departure: decrease capacity and mark departed
        return {
          ...state,
          isDwelling: false,
          currentCapacity: state.currentCapacity - waypoint.slotsToDeliver,
          deliveryStops: state.deliveryStops.map((stop, idx) =>
            idx === i
              ? { ...stop, departedAt: timestamp, slotsDelivered: waypoint.slotsToDeliver }
              : stop
          ),
        };
      }

      // Still dwelling - return state with no movement
      return { ...state, isDwelling: true };
    }
  }

  return null;
}

/**
 * Advance vehicle along route
 * Returns new state with updated position
 */
export function advanceVehicle({
  state,
  deltaSeconds,
  timestamp,
  rng,
}: AdvanceParams): VehicleSimState {
  if (state.isComplete) return state;

  // Check for waypoint arrival/departure
  const waypointState = checkWaypointArrival(state, timestamp);
  if (waypointState) {
    // If dwelling, don't advance position
    if (waypointState.isDwelling) {
      return waypointState;
    }
    // If just departed, use updated state for advancement
    state = waypointState;
  }

  // Clean up expired events
  const activeEvents = cleanExpiredEvents(state.activeEvents, timestamp);

  const current = state.route[state.segmentIndex];
  const next = state.route[state.segmentIndex + 1];

  // Route complete
  if (!next) {
    return {
      ...state,
      isComplete: true,
      activeEvents,
    };
  }

  // Calculate segment distance
  const segmentDistance = haversineMeters(current, next);

  // Get current speed based on traffic conditions
  const trafficSpeed = computeSpeedKmh({
    baseSpeedKmh: state.baseSpeedKmh,
    position: state.position,
    timestamp,
    rng,
  });

  // Apply event speed multipliers (delays, breakdowns, etc.)
  const eventMultiplier = calculateEventSpeedMultiplier(activeEvents);
  const actualSpeed = trafficSpeed * eventMultiplier;

  // Calculate distance traveled this tick
  const metersPerSecond = (actualSpeed * 1000) / 3600;
  const distanceThisTick = metersPerSecond * deltaSeconds;
  const progressDelta = distanceThisTick / segmentDistance;

  // Update progress along segment
  let progress = state.progress + progressDelta;
  let segmentIndex = state.segmentIndex;

  // Move to next segment if current complete
  if (progress >= 1) {
    segmentIndex += 1;
    progress = 0;

    // Check if this was the last segment
    if (segmentIndex >= state.route.length - 1) {
      return {
        ...state,
        segmentIndex: state.route.length - 1,
        progress: 1,
        position: state.route[state.route.length - 1],
        isComplete: true,
        activeEvents,
      };
    }
  }

  // Interpolate new position
  const currentSeg = state.route[segmentIndex];
  const nextSeg = state.route[segmentIndex + 1];
  const position = interpolatePoint(currentSeg, nextSeg, progress);

  // Calculate bearing for visual rotation
  const bearing = calculateBearing(currentSeg, nextSeg);

  return {
    ...state,
    segmentIndex,
    progress,
    position,
    bearing,
    currentSpeedKmh: actualSpeed,
    activeEvents,
  };
}

/**
 * Initialize vehicle simulation state
 */
export function initializeVehicleSimulation(
  vehicleId: string,
  route: [number, number][],
  baseSpeedKmh: number,
  waypoints?: { position: [number, number]; polylineIndex: number; dwellMinutes: number; slotsToDeliver: number; facilityId: string }[],
  initialCapacity: number = 100
): VehicleSimState {
  if (route.length < 2) {
    throw new Error(`Route for ${vehicleId} must have at least 2 points`);
  }

  const bearing = calculateBearing(route[0], route[1]);

  // Initialize delivery stops for each waypoint
  const deliveryStops: DeliveryStop[] = waypoints
    ? waypoints.map((wp, idx) => ({
        waypointIndex: idx,
        facilityId: wp.facilityId,
        arrivedAt: null,
        departedAt: null,
        dwellMinutes: wp.dwellMinutes,
        slotsDelivered: 0,
      }))
    : [];

  return {
    vehicleId,
    route,
    segmentIndex: 0,
    progress: 0,
    position: route[0],
    bearing,
    baseSpeedKmh,
    currentSpeedKmh: baseSpeedKmh,
    isComplete: false,
    activeEvents: [], // Initialize with no events
    waypoints,
    deliveryStops,
    currentCapacity: initialCapacity,
    isDwelling: false,
  };
}

/**
 * Add a delay event to vehicle state
 * Returns new state with event added
 */
export function addDelayEvent(
  state: VehicleSimState,
  reason: ActiveEvent['reason'],
  durationMin: number,
  currentTime: Date
): VehicleSimState {
  // Determine speed multiplier based on event type
  let speedMultiplier: number;
  switch (reason) {
    case 'traffic_jam':
      speedMultiplier = 0.4; // 40% speed
      break;
    case 'road_obstruction':
      speedMultiplier = 0; // Complete stop
      break;
    case 'vehicle_breakdown':
      speedMultiplier = 0; // Complete stop
      break;
    case 'fuel_stop':
      speedMultiplier = 0; // Complete stop
      break;
    default:
      speedMultiplier = 0.5; // Default to 50% speed
  }

  const endTime = new Date(currentTime.getTime() + durationMin * 60 * 1000);

  const newEvent: ActiveEvent = {
    type: 'delay',
    reason,
    durationMin,
    startTime: currentTime,
    endTime,
    speedMultiplier,
  };

  return {
    ...state,
    activeEvents: [...state.activeEvents, newEvent],
  };
}

/**
 * Reset vehicle to start of route
 */
export function resetVehicle(state: VehicleSimState): VehicleSimState {
  // Calculate initial capacity from waypoints
  const initialCapacity = state.waypoints
    ? state.waypoints.reduce((sum, wp) => sum + wp.slotsToDeliver, 0)
    : 100;

  return initializeVehicleSimulation(
    state.vehicleId,
    state.route,
    state.baseSpeedKmh,
    state.waypoints,
    initialCapacity
  );
}

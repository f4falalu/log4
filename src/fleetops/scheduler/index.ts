/**
 * =====================================================
 * FLEETOPS SCHEDULER MODULE
 * =====================================================
 *
 * Domain Owner: FleetOps
 * Responsibilities:
 *   - Time window assignment
 *   - Dispatch scheduling
 *   - Execution metadata generation
 *
 * RECEIVES: Finalized batch from Storefront
 * OUTPUT: Execution metadata (time windows, dispatch info)
 *
 * MUST NOT CHANGE:
 *   - Facilities (owned by Storefront batch)
 *   - Slots (computed from vehicle onboarding)
 *   - Route (owned by FleetOps planner)
 *   - Vehicle (assigned, not modified)
 *
 * Scheduler treats batch as IMMUTABLE INPUT.
 */

export * from './types';
export * from './time-window-assigner';
export * from './dispatch-scheduler';

/**
 * =====================================================
 * FLEETOPS PLANNER MODULE
 * =====================================================
 *
 * Domain Owner: FleetOps
 * Responsibilities:
 *   - Vehicle + route execution planning
 *   - Route optimization
 *   - Vehicle assignment
 *
 * Input: Batch + Vehicle + Route
 * Output: Executable plan
 *
 * MUST NOT:
 *   - Modify batch composition (owned by Storefront)
 *   - Modify requisitions (owned by Storefront)
 *   - Recalculate packaging (computed by Storefront)
 */

export * from './types';
export * from './route-optimizer';
export * from './vehicle-assigner';

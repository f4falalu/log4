/**
 * =====================================================
 * FLEETOPS EXECUTION MODULE
 * =====================================================
 *
 * Domain Owner: FleetOps
 * Responsibilities:
 *   - Dispatch execution
 *   - Delivery tracking
 *   - Proof of Delivery (PoD)
 *   - Execution status management
 *
 * Input: Executable plan from FleetOps planner
 * Output: Delivery records, PoD data
 */

export * from './types';
export * from './dispatch-executor';

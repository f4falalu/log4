/**
 * =====================================================
 * STOREFRONT PLANNER MODULE
 * =====================================================
 *
 * Domain Owner: Storefront
 * Responsibilities:
 *   - Facility → Requisition → Readiness workflow
 *   - Candidate selection for batching
 *   - Readiness validation
 *
 * Input: Requisitions (READY_FOR_DISPATCH only)
 * Output: Facility candidates for batching
 *
 * MUST NOT:
 *   - Know about vehicles
 *   - Know about slots
 *   - Know about route execution
 */

export * from './types';
export * from './readiness-validator';
export * from './candidate-selector';

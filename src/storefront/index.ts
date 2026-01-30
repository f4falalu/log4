/**
 * =====================================================
 * STOREFRONT DOMAIN BARREL
 * =====================================================
 *
 * Exports all Storefront domain modules.
 *
 * Storefront OWNS:
 *   - Planner (facility → requisition → readiness)
 *   - Batch (facility grouping + capacity validation)
 *   - Requisitions (state machine + packaging)
 */

export * from './batch';
export * from './planner';
export * from './requisitions';

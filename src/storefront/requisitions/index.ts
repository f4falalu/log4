/**
 * =====================================================
 * STOREFRONT REQUISITIONS MODULE
 * =====================================================
 *
 * Domain Owner: Storefront
 * Responsibilities:
 *   - Requisition state machine
 *   - Packaging computation (immutable after approval)
 *   - Status transitions
 *
 * State flow:
 * pending → approved → packaged → ready_for_dispatch →
 * assigned_to_batch → in_transit → fulfilled/failed
 *
 * IMPORTANT:
 *   - Packaging is computed ONCE at approval
 *   - Packaging is IMMUTABLE after computation
 *   - No packaging recalculation allowed
 */

export * from './types';
export * from './state-machine';
export * from './packaging-calculator';

/**
 * =====================================================
 * FLEETOPS PAYLOAD MODULE
 * =====================================================
 *
 * Domain Owner: FleetOps
 * Responsibilities:
 *   - Slot rules and math (SINGLE SOURCE OF TRUTH)
 *   - Vehicle capacity constraints
 *   - Slot assignment engine
 *   - Payload validation
 *
 * MUST:
 *   - Own all slot-related logic
 *   - Own vehicle capacity calculations
 *   - Provide deterministic validation
 *
 * MUST NOT:
 *   - Modify batch composition
 *   - Modify requisitions
 *   - Recalculate packaging (read from requisitions)
 *   - Allow runtime slot resizing
 *   - Allow silent overflow ("proceed anyway")
 *
 * SLOT RULES:
 *   - Slots come ONLY from vehicle onboarding
 *   - Slot grid is UI-only (visualization)
 *   - No runtime resizing
 *   - No silent overflow
 */

export * from './types';
export * from './slot-mapper';
export * from './slot-assignment-engine';
export * from './payload-validator';

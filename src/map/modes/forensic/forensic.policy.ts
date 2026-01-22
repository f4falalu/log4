/**
 * forensic.policy.ts
 *
 * Forensic mode policy.
 *
 * GOVERNANCE:
 * - FSM locked to 'inspect'
 * - No mutation paths
 * - Requires time context (start/end timestamps)
 * - Strictly read-only
 */

import type { InteractionState } from '@/map/core/InteractionFSM';

/**
 * Forensic mode policy
 */
export const ForensicPolicy = {
  /** Only inspect allowed */
  allowedStates: ['inspect'] as InteractionState[],

  /** Strictly read-only */
  readOnly: true,

  /** REQUIRES time context */
  requiresTimeContext: true,

  /** No live data */
  receivesLiveData: false,

  /** Minimal representation for clarity */
  defaultRepresentation: 'minimal' as const,

  /** Description */
  description: 'Time-based replay and audit. Read-only.',
} as const;

/**
 * Check if state is allowed in Forensic
 */
export function isStateAllowedInForensic(state: InteractionState): boolean {
  return ForensicPolicy.allowedStates.includes(state);
}

/**
 * Forensic mode layers
 */
export const FORENSIC_LAYERS = {
  required: [
    'base',
    'h3-hexagon',
    'playback-timeline',
  ],

  optional: [
    'replay-entities',
    'replay-events',
    'facilities',
    'warehouses',
  ],

  forbidden: [
    'h3-selection',
    'zone-preview',
    'drawing-tools',
    'live-entities',
    'live-events',
  ],
} as const;

/**
 * Check if layer is allowed in Forensic
 */
export function isLayerAllowedInForensic(layerId: string): boolean {
  if (FORENSIC_LAYERS.forbidden.includes(layerId as any)) {
    return false;
  }
  return true;
}

/**
 * Time context for forensic mode
 */
export interface ForensicTimeContext {
  /** Start of time range */
  startTime: Date;

  /** End of time range */
  endTime: Date;

  /** Currently viewed time */
  currentTime: Date;
}

/**
 * Validate forensic time context
 */
export function validateTimeContext(
  context: Partial<ForensicTimeContext>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.startTime) {
    errors.push('Start time is required');
  }

  if (!context.endTime) {
    errors.push('End time is required');
  }

  if (context.startTime && context.endTime) {
    if (context.startTime >= context.endTime) {
      errors.push('Start time must be before end time');
    }
  }

  if (context.currentTime) {
    if (context.startTime && context.currentTime < context.startTime) {
      errors.push('Current time cannot be before start time');
    }
    if (context.endTime && context.currentTime > context.endTime) {
      errors.push('Current time cannot be after end time');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

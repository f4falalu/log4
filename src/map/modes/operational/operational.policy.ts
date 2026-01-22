/**
 * operational.policy.ts
 *
 * Operational mode policy.
 *
 * GOVERNANCE:
 * - FSM CANNOT leave 'inspect' state
 * - Any attempt to mutate must throw/log
 * - Read-only, deterministic, boring, safe
 */

import type { InteractionState } from '@/map/core/InteractionFSM';

/**
 * Operational mode policy
 */
export const OperationalPolicy = {
  /** Only inspect allowed */
  allowedStates: ['inspect'] as InteractionState[],

  /** Strictly read-only */
  readOnly: true,

  /** No time context needed */
  requiresTimeContext: false,

  /** Receives live data */
  receivesLiveData: true,

  /** Default representation */
  defaultRepresentation: 'entity-rich' as const,

  /** Description */
  description: 'Live monitoring and geofencing. Read-only.',
} as const;

/**
 * Check if state is allowed in Operational
 */
export function isStateAllowedInOperational(state: InteractionState): boolean {
  return OperationalPolicy.allowedStates.includes(state);
}

/**
 * Operational mode layers
 */
export const OPERATIONAL_LAYERS = {
  required: [
    'base',
    'h3-hexagon',
    'live-entities',
  ],

  optional: [
    'live-events',
    'facilities',
    'warehouses',
    'routes',
    'vehicles',
    'drivers',
    'alerts',
  ],

  forbidden: [
    'h3-selection',
    'zone-preview',
    'drawing-tools',
    'playback-timeline',
  ],
} as const;

/**
 * Check if layer is allowed in Operational
 */
export function isLayerAllowedInOperational(layerId: string): boolean {
  if (OPERATIONAL_LAYERS.forbidden.includes(layerId as any)) {
    return false;
  }
  return true;
}

/**
 * planning.policy.ts
 *
 * Planning mode policy.
 *
 * GOVERNANCE:
 * - Only Planning mode can enter mutating states
 * - All other modes are inspect-only
 * - This is the ONLY source of truth for Planning permissions
 */

import type { InteractionState } from '@/map/core/InteractionFSM';

/**
 * Planning mode policy
 */
export const PlanningPolicy = {
  /** FSM states allowed in Planning mode */
  allowedStates: ['inspect', 'select', 'draw_zone', 'tag_zone'] as InteractionState[],

  /** Whether this mode is read-only */
  readOnly: false,

  /** Whether time context is required */
  requiresTimeContext: false,

  /** Whether live data is received */
  receivesLiveData: false,

  /** Default representation mode */
  defaultRepresentation: 'entity-rich' as const,

  /** Description */
  description: 'Create, edit, and tag zones. Full mutation access.',
} as const;

/**
 * Check if a state is allowed in Planning
 */
export function isStateAllowedInPlanning(state: InteractionState): boolean {
  return PlanningPolicy.allowedStates.includes(state);
}

/**
 * Planning mode layers
 */
export const PLANNING_LAYERS = {
  /** Required layers */
  required: [
    'base',
    'h3-hexagon',
  ],

  /** Optional layers */
  optional: [
    'h3-selection',
    'zone-preview',
    'drawing-tools',
    'facilities',
    'warehouses',
  ],

  /** Forbidden layers (from other modes) */
  forbidden: [
    'live-entities',
    'live-events',
    'playback-timeline',
  ],
} as const;

/**
 * Check if a layer is allowed in Planning
 */
export function isLayerAllowedInPlanning(layerId: string): boolean {
  if (PLANNING_LAYERS.forbidden.includes(layerId as any)) {
    return false;
  }
  return true;
}

/**
 * Planning toolbar actions
 */
export const PLANNING_ACTIONS = {
  inspect: {
    label: 'Inspect',
    icon: 'eye',
    state: 'inspect' as InteractionState,
    tooltip: 'View zone information',
  },
  select: {
    label: 'Select',
    icon: 'pointer',
    state: 'select' as InteractionState,
    tooltip: 'Select existing zones',
  },
  draw: {
    label: 'Draw Zone',
    icon: 'hexagon',
    state: 'draw_zone' as InteractionState,
    tooltip: 'Draw a new zone',
  },
  tag: {
    label: 'Tag Zone',
    icon: 'tag',
    state: 'tag_zone' as InteractionState,
    tooltip: 'Apply tags to selected zone',
  },
} as const;

/**
 * Get toolbar actions for Planning
 */
export function getPlanningActions() {
  return Object.values(PLANNING_ACTIONS);
}

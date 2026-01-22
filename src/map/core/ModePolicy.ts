/**
 * ModePolicy.ts
 *
 * Defines what each mode is allowed to do, centrally and once.
 *
 * GOVERNANCE:
 * - Mode capabilities are defined here ONLY
 * - UI and FSM consume these definitions
 * - No other file may define mode permissions
 *
 * This file has NO map dependency. Pure policy definitions.
 */

import type { InteractionState } from './InteractionFSM';

/**
 * Map modes
 */
export type MapMode = 'planning' | 'operational' | 'forensic';

/**
 * Mode policy configuration
 */
export interface ModePolicyConfig {
  /** States the FSM can enter in this mode */
  allowedStates: InteractionState[];

  /** Whether this mode is read-only (no mutations) */
  readOnly: boolean;

  /** Whether this mode requires time context (forensic) */
  requiresTimeContext: boolean;

  /** Whether this mode receives live data feeds */
  receivesLiveData: boolean;

  /** Default representation mode for display */
  defaultRepresentation: 'entity-rich' | 'minimal' | 'cluster';

  /** Description for UI/debugging */
  description: string;
}

/**
 * Policy definitions for each mode
 */
export const MODE_POLICIES: Record<MapMode, ModePolicyConfig> = {
  planning: {
    allowedStates: ['inspect', 'select', 'draw_zone', 'tag_zone'],
    readOnly: false,
    requiresTimeContext: false,
    receivesLiveData: false,
    defaultRepresentation: 'entity-rich',
    description: 'Create, edit, and tag zones. Full mutation access.',
  },

  operational: {
    allowedStates: ['inspect'],
    readOnly: true,
    requiresTimeContext: false,
    receivesLiveData: true,
    defaultRepresentation: 'entity-rich',
    description: 'Live monitoring and geofencing. Read-only.',
  },

  forensic: {
    allowedStates: ['inspect'],
    readOnly: true,
    requiresTimeContext: true,
    receivesLiveData: false,
    defaultRepresentation: 'minimal',
    description: 'Time-based replay and audit. Read-only.',
  },
};

/**
 * Get policy for a mode
 */
export function getModePolicy(mode: MapMode): ModePolicyConfig {
  return MODE_POLICIES[mode];
}

/**
 * Check if a mode allows mutations
 */
export function canModeModify(mode: MapMode): boolean {
  return !MODE_POLICIES[mode].readOnly;
}

/**
 * Check if a state is allowed in a mode
 */
export function isStateAllowedInMode(
  state: InteractionState,
  mode: MapMode
): boolean {
  return MODE_POLICIES[mode].allowedStates.includes(state);
}

/**
 * Get all modes that allow a specific state
 */
export function getModesForState(state: InteractionState): MapMode[] {
  return (Object.keys(MODE_POLICIES) as MapMode[]).filter((mode) =>
    MODE_POLICIES[mode].allowedStates.includes(state)
  );
}

/**
 * Layer governance by mode
 * Defines which layer types are allowed in each mode
 */
export interface LayerGovernance {
  allowed: string[];
  forbidden: string[];
}

export const LAYER_GOVERNANCE: Record<MapMode, LayerGovernance> = {
  planning: {
    allowed: [
      'base',
      'h3-hexagon',
      'h3-selection',
      'zone-preview',
      'drawing-tools',
      'facilities',
      'warehouses',
    ],
    forbidden: [
      'live-entities',
      'live-events',
      'playback-timeline',
    ],
  },

  operational: {
    allowed: [
      'base',
      'h3-hexagon',
      'live-entities',
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
  },

  forensic: {
    allowed: [
      'base',
      'h3-hexagon',
      'replay-entities',
      'replay-events',
      'playback-timeline',
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
  },
};

/**
 * Check if a layer type is allowed in a mode
 */
export function isLayerAllowedInMode(
  layerType: string,
  mode: MapMode
): boolean {
  const governance = LAYER_GOVERNANCE[mode];
  if (governance.forbidden.includes(layerType)) {
    return false;
  }
  return governance.allowed.includes(layerType) || governance.allowed.includes('*');
}

/**
 * Validate mode requirements
 */
export interface ModeValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateModeRequirements(
  mode: MapMode,
  context: {
    hasTimeContext?: boolean;
    hasLiveDataConnection?: boolean;
  }
): ModeValidationResult {
  const policy = MODE_POLICIES[mode];
  const errors: string[] = [];

  if (policy.requiresTimeContext && !context.hasTimeContext) {
    errors.push(`${mode} mode requires time context (start/end timestamps)`);
  }

  if (policy.receivesLiveData && !context.hasLiveDataConnection) {
    errors.push(`${mode} mode requires live data connection`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

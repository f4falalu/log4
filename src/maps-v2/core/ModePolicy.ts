/**
 * ModePolicy.ts — Defines what each mode is allowed to do.
 *
 * This is the ONLY authority on mode capabilities.
 * UI and InteractionController consume these definitions.
 */

import type { MapMode, ModeConfig, InteractionState } from './types';

export const MODE_POLICIES: Record<MapMode, ModeConfig> = {
  operational: {
    mode: 'operational',
    allowedStates: ['IDLE', 'SELECT', 'INSPECT'],
    readOnly: true,
    requiresTimeContext: false,
    receivesLiveData: true,
    layerIds: ['h3-hexagon', 'vehicle', 'facility', 'warehouse', 'route', 'alert', 'zone'],
  },
  planning: {
    mode: 'planning',
    allowedStates: ['IDLE', 'SELECT', 'HEX_SELECT', 'DRAW_ZONE', 'TAG_ZONE', 'CONFIRM', 'INSPECT'],
    readOnly: false,
    requiresTimeContext: false,
    receivesLiveData: false,
    layerIds: ['h3-hexagon', 'facility', 'warehouse', 'zone'],
  },
  forensic: {
    mode: 'forensic',
    allowedStates: ['IDLE', 'INSPECT', 'LOCKED'],
    readOnly: true,
    requiresTimeContext: true,
    receivesLiveData: false,
    layerIds: ['h3-hexagon', 'vehicle', 'facility', 'warehouse', 'route', 'zone'],
  },
};

export function getModePolicy(mode: MapMode): ModeConfig {
  return MODE_POLICIES[mode];
}

export function isStateAllowedInMode(state: InteractionState, mode: MapMode): boolean {
  return MODE_POLICIES[mode].allowedStates.includes(state);
}

export function canModeModify(mode: MapMode): boolean {
  return !MODE_POLICIES[mode].readOnly;
}

export function getLayersForMode(mode: MapMode): string[] {
  return MODE_POLICIES[mode].layerIds;
}

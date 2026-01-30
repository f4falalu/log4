/**
 * Core types for the Maps-V2 system.
 * No external dependencies. Pure type definitions.
 */

export type MapMode = 'operational' | 'planning' | 'forensic';

export type InteractionState =
  | 'IDLE'
  | 'SELECT'
  | 'HEX_SELECT'
  | 'DRAW_ZONE'
  | 'TAG_ZONE'
  | 'CONFIRM'
  | 'INSPECT'
  | 'LOCKED';

export interface ModeConfig {
  mode: MapMode;
  allowedStates: InteractionState[];
  readOnly: boolean;
  requiresTimeContext: boolean;
  receivesLiveData: boolean;
  layerIds: string[];
}

export interface StateTransitionEvent {
  from: InteractionState;
  to: InteractionState;
  timestamp: number;
  reason?: string;
}

export type StateChangeListener = (event: StateTransitionEvent) => void;

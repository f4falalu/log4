/**
 * Map Core Module
 *
 * The authoritative map system architecture.
 *
 * GOVERNANCE:
 * - All spatial truth lives in the spatial core
 * - The map is a projection layer only
 * - React never calls MapLibre directly
 * - Interaction state is explicit via FSM
 */

// MapShell - Single map owner
export { MapShell, type MapShellOptions, type MapShellState } from './MapShell';

// InteractionFSM - Explicit interaction state
export {
  InteractionFSM,
  interactionFSM,
  type InteractionState,
  type StateTransitionEvent,
  type StateChangeListener,
} from './InteractionFSM';

// ModePolicy - Mode capabilities
export {
  type MapMode,
  type ModePolicyConfig,
  type LayerGovernance,
  type ModeValidationResult,
  MODE_POLICIES,
  LAYER_GOVERNANCE,
  getModePolicy,
  canModeModify,
  isStateAllowedInMode,
  getModesForState,
  isLayerAllowedInMode,
  validateModeRequirements,
} from './ModePolicy';

// LayerRegistry - Layer lifecycle management
export {
  LayerRegistry,
  layerRegistry,
  type RenderContext,
  type MapLayer,
} from './LayerRegistry';

// Spatial Core - All spatial truth
export * from './spatial';

// Rendering - Map projection layer
export * from './rendering';

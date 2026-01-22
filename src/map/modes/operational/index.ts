/**
 * Operational Mode Module
 *
 * Live monitoring and geofencing.
 *
 * GOVERNANCE:
 * - Read-only, deterministic, boring, safe
 * - FSM locked to 'inspect'
 * - No mutation paths
 */

export {
  OperationalPolicy,
  isStateAllowedInOperational,
  isLayerAllowedInOperational,
  OPERATIONAL_LAYERS,
} from './operational.policy';

export {
  LiveEntityAdapter,
  createLiveEntityAdapter,
  type RawLiveEntity,
  type NormalizedEntity,
  type EntityUpdateCallback,
  type LiveEntityAdapterConfig,
} from './LiveEntityAdapter';

export {
  OperationalEventBridge,
  createEventBridge,
  type EventBridgeConfig,
} from './OperationalEventBridge';

/**
 * Forensic Mode Module
 *
 * Time-based replay and audit.
 *
 * GOVERNANCE:
 * - Read-only, deterministic, reproducible
 * - FSM locked to 'inspect'
 * - Requires time context
 * - Reconstructs state from audit logs
 */

export {
  ForensicPolicy,
  isStateAllowedInForensic,
  isLayerAllowedInForensic,
  FORENSIC_LAYERS,
  validateTimeContext,
  type ForensicTimeContext,
} from './forensic.policy';

export {
  ForensicReplayAdapter,
  createReplayAdapter,
  type ReplayFrame,
  type ReplayDataSource,
  type HistoricalEntityPosition,
  type ZoneAuditEntry,
} from './ForensicReplayAdapter';

export {
  ForensicTimelineController,
  createTimelineController,
  type PlaybackState,
  type PlaybackSpeed,
  type TimelineChangeEvent,
  type TimelineListener,
  type TimelineControllerConfig,
} from './ForensicTimelineController';

export { ForensicMap } from './ForensicMap';
export { ForensicTimelineBar } from './ForensicTimelineBar';

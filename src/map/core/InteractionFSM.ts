/**
 * InteractionFSM.ts
 *
 * Global interaction state machine.
 *
 * GOVERNANCE:
 * - All user interactions are governed by explicit state
 * - Default state is always 'inspect'
 * - Only Planning mode may enter mutating states
 * - Operational and Forensic are locked to 'inspect'
 * - All mutations must check canMutate() before proceeding
 *
 * This file has NO map dependency. Pure state logic.
 */

import type { MapMode } from './ModePolicy';

/**
 * Valid interaction states
 */
export type InteractionState =
  | 'inspect'    // Read-only viewing (default)
  | 'select'     // Select existing zones/entities
  | 'draw_zone'  // Create new zone geometry
  | 'tag_zone';  // Apply tags to selected zone

/**
 * States that allow mutation
 */
const MUTATING_STATES: InteractionState[] = ['draw_zone', 'tag_zone'];

/**
 * States allowed per mode
 */
const MODE_ALLOWED_STATES: Record<MapMode, InteractionState[]> = {
  planning: ['inspect', 'select', 'draw_zone', 'tag_zone'],
  operational: ['inspect'],
  forensic: ['inspect'],
};

/**
 * State transition event
 */
export interface StateTransitionEvent {
  from: InteractionState;
  to: InteractionState;
  timestamp: number;
  reason?: string;
}

/**
 * Listener for state changes
 */
export type StateChangeListener = (event: StateTransitionEvent) => void;

/**
 * InteractionFSM - Explicit interaction state management
 *
 * Responsibilities:
 * - Track current interaction state
 * - Validate state transitions
 * - Provide canMutate() guard
 * - Emit state change events
 *
 * Must NOT:
 * - Know about map
 * - Know about layers
 * - Know about spatial logic
 */
export class InteractionFSM {
  private state: InteractionState = 'inspect';
  private mode: MapMode = 'operational';
  private listeners: Set<StateChangeListener> = new Set();
  private history: StateTransitionEvent[] = [];
  private readonly maxHistorySize = 50;

  /**
   * Get current interaction state
   */
  getState(): InteractionState {
    return this.state;
  }

  /**
   * Get current mode
   */
  getMode(): MapMode {
    return this.mode;
  }

  /**
   * Set the map mode
   * Resets state to 'inspect' if current state not allowed in new mode
   */
  setMode(mode: MapMode): void {
    const previousMode = this.mode;
    this.mode = mode;

    // Reset to inspect if current state not allowed in new mode
    const allowedStates = MODE_ALLOWED_STATES[mode];
    if (!allowedStates.includes(this.state)) {
      this.setState('inspect', `Mode changed from ${previousMode} to ${mode}`);
    }
  }

  /**
   * Attempt to set a new interaction state
   * Returns true if transition was successful
   */
  setState(next: InteractionState, reason?: string): boolean {
    // Validate transition is allowed in current mode
    const allowedStates = MODE_ALLOWED_STATES[this.mode];
    if (!allowedStates.includes(next)) {
      console.warn(
        `[InteractionFSM] State '${next}' not allowed in mode '${this.mode}'`
      );
      return false;
    }

    const previous = this.state;
    if (previous === next) {
      return true; // No-op, already in this state
    }

    this.state = next;

    const event: StateTransitionEvent = {
      from: previous,
      to: next,
      timestamp: Date.now(),
      reason,
    };

    this.recordHistory(event);
    this.notifyListeners(event);

    console.log(
      `[InteractionFSM] ${previous} → ${next}${reason ? ` (${reason})` : ''}`
    );

    return true;
  }

  /**
   * Reset to default state (inspect)
   */
  reset(reason?: string): void {
    this.setState('inspect', reason ?? 'Reset to default');
  }

  /**
   * Check if current state allows mutation
   * CRITICAL: All mutation code paths must call this
   */
  canMutate(): boolean {
    return MUTATING_STATES.includes(this.state);
  }

  /**
   * Check if a specific state is allowed in current mode
   */
  isStateAllowed(state: InteractionState): boolean {
    return MODE_ALLOWED_STATES[this.mode].includes(state);
  }

  /**
   * Get all states allowed in current mode
   */
  getAllowedStates(): InteractionState[] {
    return [...MODE_ALLOWED_STATES[this.mode]];
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get recent state transition history
   */
  getHistory(count?: number): StateTransitionEvent[] {
    const limit = count ?? this.history.length;
    return this.history.slice(-limit);
  }

  /**
   * Clear state and destroy listeners
   */
  destroy(): void {
    this.state = 'inspect';
    this.listeners.clear();
    this.history = [];
  }

  /**
   * Record transition in history
   */
  private recordHistory(event: StateTransitionEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(event: StateTransitionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[InteractionFSM] Error in listener:', error);
      }
    });
  }
}

/**
 * Singleton instance
 * Use this for global interaction state
 */
export const interactionFSM = new InteractionFSM();

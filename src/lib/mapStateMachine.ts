/**
 * MapRuntime State Machine
 *
 * Formal state machine for MapRuntime lifecycle management
 * Replaces boolean flags with explicit state transitions
 *
 * CRITICAL: Prevents race conditions, provides timeout protection, enables error recovery
 */

/**
 * MapRuntime lifecycle states
 */
export enum MapRuntimeState {
  /** Initial state - no map instance */
  UNINITIALIZED = 'UNINITIALIZED',

  /** Map instance created, waiting for load event */
  INITIALIZING = 'INITIALIZING',

  /** Map load event fired, mounting layers */
  LOADING_LAYERS = 'LOADING_LAYERS',

  /** All layers mounted, flushing pending updates */
  LAYERS_MOUNTED = 'LAYERS_MOUNTED',

  /** Fully operational - accepting updates */
  READY = 'READY',

  /** Error occurred, partial functionality */
  DEGRADED = 'DEGRADED',

  /** Container lost, map exists but not visible */
  DETACHED = 'DETACHED',

  /** Map destroyed, needs reinitialization */
  DESTROYED = 'DESTROYED',
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<MapRuntimeState, MapRuntimeState[]> = {
  [MapRuntimeState.UNINITIALIZED]: [
    MapRuntimeState.INITIALIZING,
    MapRuntimeState.DESTROYED, // Allow cleanup from uninitialized
  ],
  [MapRuntimeState.INITIALIZING]: [
    MapRuntimeState.LOADING_LAYERS,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // Allow detachment during initialization (component unmount)
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.LOADING_LAYERS]: [
    MapRuntimeState.LAYERS_MOUNTED,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // Allow detachment during layer loading
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.LAYERS_MOUNTED]: [
    MapRuntimeState.READY,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DETACHED, // Allow detachment before ready
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.READY]: [
    MapRuntimeState.DETACHED,
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.DEGRADED]: [
    MapRuntimeState.READY, // Recovery possible
    MapRuntimeState.DETACHED, // Allow detachment from degraded state
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.DETACHED]: [
    MapRuntimeState.INITIALIZING, // Allow reinitialization from detached
    MapRuntimeState.READY, // Reattachment successful
    MapRuntimeState.DEGRADED,
    MapRuntimeState.DESTROYED,
  ],
  [MapRuntimeState.DESTROYED]: [
    MapRuntimeState.UNINITIALIZED, // Allow reinitialization
  ],
};

/**
 * Timeout limits for async states (in milliseconds)
 */
export const STATE_TIMEOUTS: Partial<Record<MapRuntimeState, number>> = {
  [MapRuntimeState.INITIALIZING]: 10000, // 10s to load map
  [MapRuntimeState.LOADING_LAYERS]: 5000, // 5s to mount layers
  [MapRuntimeState.LAYERS_MOUNTED]: 2000, // 2s to flush updates
};

/**
 * State transition event
 */
export interface StateTransitionEvent {
  from: MapRuntimeState;
  to: MapRuntimeState;
  reason: string;
  timestamp: Date;
}

/**
 * State transition error
 */
export class InvalidStateTransitionError extends Error {
  constructor(from: MapRuntimeState, to: MapRuntimeState) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * State timeout error
 */
export class StateTimeoutError extends Error {
  constructor(state: MapRuntimeState, timeout: number) {
    super(`State ${state} timed out after ${timeout}ms`);
    this.name = 'StateTimeoutError';
  }
}

/**
 * MapRuntime State Machine Controller
 *
 * Manages state transitions with validation and timeout protection
 */
export class MapStateMachine {
  private currentState: MapRuntimeState = MapRuntimeState.UNINITIALIZED;
  private stateHistory: StateTransitionEvent[] = [];
  private timeoutTimer: number | null = null;
  private listeners: Array<(event: StateTransitionEvent) => void> = [];

  /**
   * Get current state
   */
  getState(): MapRuntimeState {
    return this.currentState;
  }

  /**
   * Check if in a specific state
   */
  is(state: MapRuntimeState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if in any of the specified states
   */
  isIn(states: MapRuntimeState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * Check if state allows updates
   */
  canAcceptUpdates(): boolean {
    return this.is(MapRuntimeState.READY) || this.is(MapRuntimeState.DEGRADED);
  }

  /**
   * Validate transition is allowed
   */
  private isValidTransition(to: MapRuntimeState): boolean {
    const allowedTransitions = VALID_TRANSITIONS[this.currentState] || [];
    return allowedTransitions.includes(to);
  }

  /**
   * Transition to new state with validation
   */
  setState(to: MapRuntimeState, reason: string): void {
    const from = this.currentState;

    // Validate transition
    if (!this.isValidTransition(to)) {
      const error = new InvalidStateTransitionError(from, to);
      console.error('[MapStateMachine]', error.message, { from, to, reason });
      throw error;
    }

    // Clear any existing timeout
    this.clearTimeout();

    // Perform transition
    this.currentState = to;

    // Record transition
    const event: StateTransitionEvent = {
      from,
      to,
      reason,
      timestamp: new Date(),
    };

    this.stateHistory.push(event);

    // Log transition
    console.log(`[MapStateMachine] ${from} → ${to} (${reason})`);

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MapStateMachine] Listener error:', error);
      }
    });

    // Set timeout if state has one
    this.startTimeoutIfNeeded(to);
  }

  /**
   * Start timeout timer for state if configured
   */
  private startTimeoutIfNeeded(state: MapRuntimeState): void {
    const timeout = STATE_TIMEOUTS[state];
    if (!timeout) return;

    this.timeoutTimer = window.setTimeout(() => {
      console.error(`[MapStateMachine] State ${state} timed out after ${timeout}ms`);

      // Attempt recovery by transitioning to DEGRADED
      try {
        this.setState(
          MapRuntimeState.DEGRADED,
          `Timeout in ${state} after ${timeout}ms`
        );
      } catch (error) {
        console.error('[MapStateMachine] Failed to transition to DEGRADED:', error);
      }
    }, timeout);
  }

  /**
   * Clear timeout timer
   */
  private clearTimeout(): void {
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (event: StateTransitionEvent) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get state history (for debugging)
   */
  getHistory(): StateTransitionEvent[] {
    return [...this.stateHistory];
  }

  /**
   * Get last N transitions
   */
  getRecentHistory(count: number = 5): StateTransitionEvent[] {
    return this.stateHistory.slice(-count);
  }

  /**
   * Reset state machine (for cleanup/reinitialization)
   */
  reset(): void {
    this.clearTimeout();
    this.currentState = MapRuntimeState.UNINITIALIZED;
    this.stateHistory = [];
    console.log('[MapStateMachine] Reset to UNINITIALIZED');
  }

  /**
   * Destroy state machine (cleanup all resources)
   */
  destroy(): void {
    this.clearTimeout();
    this.listeners = [];
    this.stateHistory = [];
    this.currentState = MapRuntimeState.DESTROYED;
    console.log('[MapStateMachine] Destroyed');
  }
}

/**
 * MapState.ts
 *
 * State machine for map lifecycle management
 * Tracks initialization, errors, degradation, and offline states
 */

/**
 * Map States
 * Represents the current operational state of the map
 */
export enum MapState {
  /** Map is being initialized */
  INITIALIZING = 'INITIALIZING',

  /** Map is ready and operational */
  READY = 'READY',

  /** Map is degraded (e.g., slow network, missing tiles) */
  DEGRADED = 'DEGRADED',

  /** Map is offline (no network connection) */
  OFFLINE = 'OFFLINE',

  /** Map encountered a fatal error */
  ERROR = 'ERROR',
}

/**
 * State Transition Events
 * Events that trigger state transitions
 */
export enum MapStateEvent {
  /** Map initialization started */
  INIT_START = 'INIT_START',

  /** Map initialization completed successfully */
  INIT_SUCCESS = 'INIT_SUCCESS',

  /** Map initialization failed */
  INIT_ERROR = 'INIT_ERROR',

  /** Map encountered an error during operation */
  RUNTIME_ERROR = 'RUNTIME_ERROR',

  /** Network connection lost */
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',

  /** Network connection restored */
  NETWORK_ONLINE = 'NETWORK_ONLINE',

  /** Tile loading is slow or failing */
  TILES_DEGRADED = 'TILES_DEGRADED',

  /** Tile loading recovered */
  TILES_RECOVERED = 'TILES_RECOVERED',

  /** Map was manually reset */
  RESET = 'RESET',
}

/**
 * State Transition Definition
 */
interface StateTransition {
  from: MapState;
  to: MapState;
  event: MapStateEvent;
  timestamp: number;
}

/**
 * State Change Callback
 */
export type StateChangeCallback = (transition: StateTransition) => void;

/**
 * Map State Machine
 * Manages state transitions and enforces valid transitions
 */
export class MapStateMachine {
  private currentState: MapState = MapState.INITIALIZING;
  private stateHistory: StateTransition[] = [];
  private listeners: StateChangeCallback[] = [];

  /**
   * Valid state transitions
   * Defines which transitions are allowed
   */
  private readonly validTransitions: Record<
    MapState,
    Partial<Record<MapStateEvent, MapState>>
  > = {
    [MapState.INITIALIZING]: {
      [MapStateEvent.INIT_SUCCESS]: MapState.READY,
      [MapStateEvent.INIT_ERROR]: MapState.ERROR,
      [MapStateEvent.NETWORK_OFFLINE]: MapState.OFFLINE,
    },
    [MapState.READY]: {
      [MapStateEvent.RUNTIME_ERROR]: MapState.ERROR,
      [MapStateEvent.NETWORK_OFFLINE]: MapState.OFFLINE,
      [MapStateEvent.TILES_DEGRADED]: MapState.DEGRADED,
      [MapStateEvent.RESET]: MapState.INITIALIZING,
    },
    [MapState.DEGRADED]: {
      [MapStateEvent.TILES_RECOVERED]: MapState.READY,
      [MapStateEvent.NETWORK_OFFLINE]: MapState.OFFLINE,
      [MapStateEvent.RUNTIME_ERROR]: MapState.ERROR,
      [MapStateEvent.RESET]: MapState.INITIALIZING,
    },
    [MapState.OFFLINE]: {
      [MapStateEvent.NETWORK_ONLINE]: MapState.READY,
      [MapStateEvent.RESET]: MapState.INITIALIZING,
    },
    [MapState.ERROR]: {
      [MapStateEvent.RESET]: MapState.INITIALIZING,
    },
  };

  /**
   * Get current state
   */
  getState(): MapState {
    return this.currentState;
  }

  /**
   * Check if map is operational
   */
  isOperational(): boolean {
    return this.currentState === MapState.READY || this.currentState === MapState.DEGRADED;
  }

  /**
   * Transition to a new state
   * @param event - Event triggering the transition
   * @returns true if transition succeeded, false if invalid
   */
  transition(event: MapStateEvent): boolean {
    const validNextStates = this.validTransitions[this.currentState];
    const nextState = validNextStates?.[event];

    if (!nextState) {
      console.warn(
        `[MapStateMachine] Invalid transition: ${this.currentState} -> ${event}`,
        'Valid events:',
        Object.keys(validNextStates || {})
      );
      return false;
    }

    const transition: StateTransition = {
      from: this.currentState,
      to: nextState,
      event,
      timestamp: Date.now(),
    };

    this.currentState = nextState;
    this.stateHistory.push(transition);

    // Notify listeners
    this.listeners.forEach((listener) => listener(transition));

    console.log(
      `[MapStateMachine] ${transition.from} -> ${transition.to} (${event})`
    );

    return true;
  }

  /**
   * Subscribe to state changes
   * @param callback - Function to call on state change
   * @returns Unsubscribe function
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get state history (for debugging/forensics)
   */
  getHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Reset the state machine
   */
  reset(): void {
    this.transition(MapStateEvent.RESET);
  }
}

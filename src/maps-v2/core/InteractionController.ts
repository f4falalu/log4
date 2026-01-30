/**
 * InteractionController.ts — Explicit interaction state machine.
 *
 * Governs what a user can do on the map, when, and how.
 * No map interaction is allowed unless explicitly permitted by the current state.
 *
 * Principles:
 * - Single active tool at a time
 * - Confirmation before mutation
 * - Mode-constrained capability
 * - Invalid transitions throw warnings
 */

import type { MapMode, InteractionState, StateTransitionEvent, StateChangeListener } from './types';
import { MODE_POLICIES } from './ModePolicy';

/** Valid transitions from each state */
const TRANSITION_GRAPH: Record<InteractionState, InteractionState[]> = {
  IDLE: ['SELECT', 'HEX_SELECT', 'DRAW_ZONE', 'INSPECT', 'LOCKED'],
  SELECT: ['IDLE', 'INSPECT', 'HEX_SELECT', 'DRAW_ZONE', 'LOCKED'],
  HEX_SELECT: ['IDLE', 'CONFIRM', 'LOCKED'],
  DRAW_ZONE: ['IDLE', 'CONFIRM', 'LOCKED'],
  TAG_ZONE: ['IDLE', 'CONFIRM', 'LOCKED'],
  CONFIRM: ['IDLE', 'LOCKED'],
  INSPECT: ['IDLE', 'SELECT', 'LOCKED'],
  LOCKED: ['IDLE'],
};

export class InteractionController {
  private state: InteractionState = 'IDLE';
  private mode: MapMode = 'operational';
  private listeners = new Set<StateChangeListener>();
  private lockReason: string | null = null;

  getState(): InteractionState {
    return this.state;
  }

  getMode(): MapMode {
    return this.mode;
  }

  getLockReason(): string | null {
    return this.lockReason;
  }

  setMode(mode: MapMode): void {
    this.mode = mode;
    // Reset to IDLE if current state not allowed in new mode
    if (!this.isAllowed(this.state)) {
      this.forceState('IDLE', `Mode changed to ${mode}`);
    }
  }

  /**
   * Attempt a state transition.
   * Returns true if successful, false if denied.
   */
  transition(target: InteractionState, reason?: string): boolean {
    // Check if target is allowed in current mode
    if (!this.isAllowed(target)) {
      console.warn(
        `[InteractionController] State '${target}' not allowed in mode '${this.mode}'`
      );
      return false;
    }

    // Check if transition is valid from current state
    const validTargets = TRANSITION_GRAPH[this.state];
    if (!validTargets.includes(target)) {
      console.warn(
        `[InteractionController] Invalid transition: ${this.state} → ${target}`
      );
      return false;
    }

    const previous = this.state;
    this.state = target;

    if (target === 'LOCKED') {
      this.lockReason = reason ?? 'Unknown';
    } else {
      this.lockReason = null;
    }

    this.emit({ from: previous, to: target, timestamp: Date.now(), reason });
    return true;
  }

  /**
   * Lock the map (from any state).
   */
  lock(reason: string): void {
    const previous = this.state;
    this.state = 'LOCKED';
    this.lockReason = reason;
    this.emit({ from: previous, to: 'LOCKED', timestamp: Date.now(), reason });
  }

  /**
   * Unlock the map (returns to IDLE).
   */
  unlock(): void {
    if (this.state !== 'LOCKED') return;
    this.lockReason = null;
    const previous = this.state;
    this.state = 'IDLE';
    this.emit({ from: previous, to: 'IDLE', timestamp: Date.now(), reason: 'Unlocked' });
  }

  /**
   * Check if a state is allowed in the current mode.
   */
  isAllowed(state: InteractionState): boolean {
    // LOCKED is always allowed (from ANY state)
    if (state === 'LOCKED') return true;
    return MODE_POLICIES[this.mode].allowedStates.includes(state);
  }

  /**
   * Check if current state permits mutation.
   */
  canMutate(): boolean {
    return this.state === 'DRAW_ZONE' || this.state === 'TAG_ZONE' || this.state === 'CONFIRM';
  }

  /**
   * Can transition to a given target from current state?
   */
  canTransition(target: InteractionState): boolean {
    if (!this.isAllowed(target)) return false;
    return TRANSITION_GRAPH[this.state].includes(target);
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.state = 'IDLE';
    this.listeners.clear();
    this.lockReason = null;
  }

  private forceState(state: InteractionState, reason: string): void {
    const previous = this.state;
    this.state = state;
    this.lockReason = null;
    this.emit({ from: previous, to: state, timestamp: Date.now(), reason });
  }

  private emit(event: StateTransitionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[InteractionController] Listener error:', error);
      }
    });
  }
}

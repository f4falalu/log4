/**
 * PlaybackClock.ts — Bridges timeline playback with interaction state.
 *
 * When playback is running → LOCKED (no map interaction)
 * When paused → IDLE (inspection allowed)
 */

import type { InteractionController } from '../core/InteractionController';
import type { TimelineController, TimelineState } from './TimelineController';

export class PlaybackClock {
  private interactionController: InteractionController;
  private timelineController: TimelineController;
  private unsubscribe: (() => void) | null = null;

  constructor(
    interactionController: InteractionController,
    timelineController: TimelineController
  ) {
    this.interactionController = interactionController;
    this.timelineController = timelineController;
  }

  /**
   * Start watching the timeline and managing interaction state.
   */
  attach(): void {
    this.unsubscribe = this.timelineController.subscribe((state) => {
      this.onTimelineChange(state);
    });

    // Set initial state
    const current = this.timelineController.getState();
    this.onTimelineChange(current);
  }

  /**
   * Stop watching.
   */
  detach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // Restore to IDLE
    this.interactionController.unlock();
  }

  private onTimelineChange(state: TimelineState): void {
    if (state.isPlaying) {
      // Lock interaction during playback
      if (this.interactionController.getState() !== 'LOCKED') {
        this.interactionController.lock('Forensic playback in progress');
      }
    } else {
      // Unlock when paused
      if (this.interactionController.getState() === 'LOCKED') {
        this.interactionController.unlock();
      }
    }
  }
}

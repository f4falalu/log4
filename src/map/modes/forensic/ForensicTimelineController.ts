/**
 * ForensicTimelineController.ts
 *
 * Time navigation controller.
 *
 * GOVERNANCE:
 * - Controls WHAT TIME is being viewed, nothing else
 * - Timeline controls state only
 * - Rendering reacts passively
 * - No logic inside UI components
 */

/**
 * Playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Playback speed options
 */
export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

/**
 * Timeline change event
 */
export interface TimelineChangeEvent {
  currentTime: Date;
  previousTime: Date;
  playbackState: PlaybackState;
  speed: PlaybackSpeed;
}

/**
 * Timeline listener
 */
export type TimelineListener = (event: TimelineChangeEvent) => void;

/**
 * Timeline controller configuration
 */
export interface TimelineControllerConfig {
  /** Start of time range */
  startTime: Date;

  /** End of time range */
  endTime: Date;

  /** Initial position (defaults to startTime) */
  initialTime?: Date;

  /** Update interval in ms (how often to advance when playing) */
  updateIntervalMs?: number;

  /** Time listener callback */
  onTimeChange?: TimelineListener;
}

/**
 * ForensicTimelineController - Time navigation
 *
 * RESPONSIBILITIES:
 * - Track current playback time
 * - Handle play/pause/stop
 * - Handle speed changes
 * - Handle seeking
 * - Emit time change events
 *
 * RULES:
 * - Timeline controls state only
 * - Rendering reacts passively
 * - No logic inside UI components
 */
export class ForensicTimelineController {
  private startTime: Date;
  private endTime: Date;
  private currentTime: Date;
  private playbackState: PlaybackState = 'stopped';
  private speed: PlaybackSpeed = 1;
  private updateIntervalMs: number;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<TimelineListener>();

  constructor(config: TimelineControllerConfig) {
    this.startTime = config.startTime;
    this.endTime = config.endTime;
    this.currentTime = config.initialTime ?? config.startTime;
    this.updateIntervalMs = config.updateIntervalMs ?? 100;

    if (config.onTimeChange) {
      this.listeners.add(config.onTimeChange);
    }
  }

  /**
   * Get current time
   */
  getTime(): Date {
    return new Date(this.currentTime);
  }

  /**
   * Get time range
   */
  getTimeRange(): { start: Date; end: Date } {
    return {
      start: new Date(this.startTime),
      end: new Date(this.endTime),
    };
  }

  /**
   * Get playback state
   */
  getState(): PlaybackState {
    return this.playbackState;
  }

  /**
   * Get current speed
   */
  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  /**
   * Set time directly (seek)
   */
  setTime(time: Date): void {
    const previousTime = this.currentTime;

    // Clamp to valid range
    if (time < this.startTime) {
      this.currentTime = new Date(this.startTime);
    } else if (time > this.endTime) {
      this.currentTime = new Date(this.endTime);
    } else {
      this.currentTime = new Date(time);
    }

    this.emitChange(previousTime);
  }

  /**
   * Set time by percentage (0-1)
   */
  setTimeByPercent(percent: number): void {
    const clamped = Math.max(0, Math.min(1, percent));
    const range = this.endTime.getTime() - this.startTime.getTime();
    const targetTime = new Date(this.startTime.getTime() + range * clamped);
    this.setTime(targetTime);
  }

  /**
   * Get current time as percentage (0-1)
   */
  getTimePercent(): number {
    const range = this.endTime.getTime() - this.startTime.getTime();
    if (range === 0) return 0;

    const elapsed = this.currentTime.getTime() - this.startTime.getTime();
    return elapsed / range;
  }

  /**
   * Start playback
   */
  play(): void {
    if (this.playbackState === 'playing') return;

    // If at end, restart from beginning
    if (this.currentTime >= this.endTime) {
      this.currentTime = new Date(this.startTime);
    }

    this.playbackState = 'playing';
    this.startInterval();
    this.emitChange(this.currentTime);

    console.log('[TimelineController] Playing at speed:', this.speed);
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.playbackState !== 'playing') return;

    this.playbackState = 'paused';
    this.stopInterval();
    this.emitChange(this.currentTime);

    console.log('[TimelineController] Paused');
  }

  /**
   * Stop playback (resets to start)
   */
  stop(): void {
    const wasPlaying = this.playbackState === 'playing';

    this.playbackState = 'stopped';
    this.stopInterval();

    if (wasPlaying) {
      const previousTime = this.currentTime;
      this.currentTime = new Date(this.startTime);
      this.emitChange(previousTime);
    }

    console.log('[TimelineController] Stopped');
  }

  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this.playbackState === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;

    // Restart interval if playing
    if (this.playbackState === 'playing') {
      this.stopInterval();
      this.startInterval();
    }

    console.log('[TimelineController] Speed set to:', speed);
  }

  /**
   * Step forward by a duration
   */
  stepForward(durationMs: number): void {
    const newTime = new Date(this.currentTime.getTime() + durationMs);
    this.setTime(newTime);
  }

  /**
   * Step backward by a duration
   */
  stepBackward(durationMs: number): void {
    const newTime = new Date(this.currentTime.getTime() - durationMs);
    this.setTime(newTime);
  }

  /**
   * Subscribe to time changes
   */
  subscribe(listener: TimelineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Destroy controller
   */
  destroy(): void {
    this.stopInterval();
    this.listeners.clear();
  }

  /**
   * Start update interval
   */
  private startInterval(): void {
    this.intervalHandle = setInterval(() => {
      this.tick();
    }, this.updateIntervalMs);
  }

  /**
   * Stop update interval
   */
  private stopInterval(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Advance time by one tick
   */
  private tick(): void {
    const previousTime = this.currentTime;

    // Calculate time to advance (real time * speed)
    const advanceMs = this.updateIntervalMs * this.speed;
    const newTime = new Date(this.currentTime.getTime() + advanceMs);

    // Check if we've reached the end
    if (newTime >= this.endTime) {
      this.currentTime = new Date(this.endTime);
      this.pause();
    } else {
      this.currentTime = newTime;
    }

    this.emitChange(previousTime);
  }

  /**
   * Emit change event to all listeners
   */
  private emitChange(previousTime: Date): void {
    const event: TimelineChangeEvent = {
      currentTime: new Date(this.currentTime),
      previousTime: new Date(previousTime),
      playbackState: this.playbackState,
      speed: this.speed,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[TimelineController] Error in listener:', error);
      }
    });
  }
}

/**
 * Create a timeline controller
 */
export function createTimelineController(
  config: TimelineControllerConfig
): ForensicTimelineController {
  return new ForensicTimelineController(config);
}

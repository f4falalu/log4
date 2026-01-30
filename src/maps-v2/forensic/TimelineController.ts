/**
 * TimelineController.ts — Forensic playback time management.
 *
 * Controls:
 * - Play / Pause / Seek
 * - Speed multiplier (1x, 2x, 5x, 10x)
 * - Emits current time to subscribers
 *
 * The timeline is immutable — no creation actions.
 */

export interface TimelineState {
  startTime: number; // epoch ms
  endTime: number;   // epoch ms
  currentTime: number; // epoch ms
  isPlaying: boolean;
  speed: number;
}

export type TimelineListener = (state: TimelineState) => void;

export class TimelineController {
  private startTime: number;
  private endTime: number;
  private currentTime: number;
  private isPlaying = false;
  private speed = 1;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<TimelineListener>();
  private lastTickTime = 0;

  constructor(startTime: Date, endTime: Date) {
    this.startTime = startTime.getTime();
    this.endTime = endTime.getTime();
    this.currentTime = this.startTime;
  }

  /**
   * Start playback.
   */
  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTickTime = performance.now();

    this.tickInterval = setInterval(() => {
      this.tick();
    }, 50); // 20fps tick rate

    this.emit();
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.emit();
  }

  /**
   * Seek to a specific time.
   */
  seek(time: Date): void {
    this.currentTime = Math.max(
      this.startTime,
      Math.min(this.endTime, time.getTime())
    );
    this.emit();
  }

  /**
   * Seek to a progress value (0–1).
   */
  seekProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    this.currentTime = this.startTime + (this.endTime - this.startTime) * clamped;
    this.emit();
  }

  /**
   * Set playback speed multiplier.
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(20, speed));
    this.emit();
  }

  /**
   * Get current timeline state.
   */
  getState(): TimelineState {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      speed: this.speed,
    };
  }

  /**
   * Get progress (0–1).
   */
  getProgress(): number {
    const total = this.endTime - this.startTime;
    if (total <= 0) return 0;
    return (this.currentTime - this.startTime) / total;
  }

  /**
   * Subscribe to timeline changes.
   */
  subscribe(listener: TimelineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Destroy and clean up.
   */
  destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  private tick(): void {
    const now = performance.now();
    const deltaReal = now - this.lastTickTime;
    this.lastTickTime = now;

    // Advance simulation time by delta * speed
    // deltaReal is in ms, and we want to advance the timeline by that * speed
    const advance = deltaReal * this.speed;
    this.currentTime += advance;

    // Loop or stop at end
    if (this.currentTime >= this.endTime) {
      this.currentTime = this.startTime;
    }

    this.emit();
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[TimelineController] Listener error:', error);
      }
    });
  }
}

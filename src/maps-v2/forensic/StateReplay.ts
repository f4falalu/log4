/**
 * StateReplay.ts — Interpolates entity state for a given timestamp.
 *
 * Stores temporal snapshots and provides:
 * - Exact state at recorded times
 * - Linear interpolation between snapshots for positions
 * - Range queries for time windows
 */

export interface TemporalSnapshot<T> {
  timestamp: number; // epoch ms
  data: T;
}

export interface InterpolatablePosition {
  lat: number;
  lng: number;
  bearing: number;
}

export class StateReplay<T> {
  private snapshots: TemporalSnapshot<T>[] = [];

  /**
   * Add a snapshot at a given time.
   * Snapshots should be added in chronological order.
   */
  addSnapshot(timestamp: Date, data: T): void {
    this.snapshots.push({ timestamp: timestamp.getTime(), data });
  }

  /**
   * Load multiple snapshots at once (replaces existing).
   */
  loadSnapshots(snapshots: TemporalSnapshot<T>[]): void {
    this.snapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get the nearest snapshot at or before the given time.
   */
  getStateAt(time: Date): T | null {
    const t = time.getTime();
    if (this.snapshots.length === 0) return null;

    // Binary search for the last snapshot <= t
    let lo = 0;
    let hi = this.snapshots.length - 1;

    if (t < this.snapshots[0].timestamp) return this.snapshots[0].data;
    if (t >= this.snapshots[hi].timestamp) return this.snapshots[hi].data;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.snapshots[mid].timestamp <= t) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return this.snapshots[hi].data;
  }

  /**
   * Get snapshots within a time range.
   */
  getRange(start: Date, end: Date): TemporalSnapshot<T>[] {
    const s = start.getTime();
    const e = end.getTime();
    return this.snapshots.filter((snap) => snap.timestamp >= s && snap.timestamp <= e);
  }

  /**
   * Get total snapshot count.
   */
  size(): number {
    return this.snapshots.length;
  }

  /**
   * Get time bounds.
   */
  getBounds(): { start: number; end: number } | null {
    if (this.snapshots.length === 0) return null;
    return {
      start: this.snapshots[0].timestamp,
      end: this.snapshots[this.snapshots.length - 1].timestamp,
    };
  }

  /**
   * Clear all snapshots.
   */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Interpolate position between two snapshots based on time.
 */
export function interpolatePosition(
  before: TemporalSnapshot<InterpolatablePosition>,
  after: TemporalSnapshot<InterpolatablePosition>,
  time: number
): InterpolatablePosition {
  const total = after.timestamp - before.timestamp;
  if (total <= 0) return before.data;

  const t = Math.max(0, Math.min(1, (time - before.timestamp) / total));

  return {
    lat: before.data.lat + (after.data.lat - before.data.lat) * t,
    lng: before.data.lng + (after.data.lng - before.data.lng) * t,
    bearing: lerpAngle(before.data.bearing, after.data.bearing, t),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

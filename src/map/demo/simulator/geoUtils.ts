/**
 * Geo Utilities
 *
 * Haversine distance, bearing calculation, and point interpolation
 */

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineMeters(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371000; // Earth radius in meters

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate bearing from point A to point B
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;

  return (bearingDeg + 360) % 360;
}

/**
 * Interpolate point along a line segment
 * @param start Start point [lng, lat]
 * @param end End point [lng, lat]
 * @param progress Progress along line (0-1)
 * @returns Interpolated point [lng, lat]
 */
export function interpolatePoint(
  start: [number, number],
  end: [number, number],
  progress: number
): [number, number] {
  const lng = start[0] + (end[0] - start[0]) * progress;
  const lat = start[1] + (end[1] - start[1]) * progress;
  return [lng, lat];
}

/**
 * Seeded pseudo-random number generator
 * Critical for deterministic replay in forensic mode
 */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

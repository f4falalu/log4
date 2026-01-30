/**
 * Geo utilities for demo simulation.
 */

/**
 * Interpolate between two coordinates.
 */
export function interpolateCoord(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
}

/**
 * Calculate bearing between two points in degrees.
 */
export function bearing(
  from: [number, number],
  to: [number, number]
): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearingRad = Math.atan2(y, x);
  return ((bearingRad * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate distance between two points in meters (Haversine).
 */
export function distanceMeters(
  from: [number, number],
  to: [number, number]
): number {
  const R = 6371000;
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total route length in meters.
 */
export function routeLength(coordinates: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += distanceMeters(coordinates[i - 1], coordinates[i]);
  }
  return total;
}

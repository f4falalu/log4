import { calculateDistance } from '@/lib/routeOptimization';

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
}

/**
 * Compute a pairwise distance matrix (in km) for a set of points.
 * Returns a 2D array where matrix[i][j] is the haversine distance
 * between points[i] and points[j].
 */
export function computeDistanceMatrix(points: GeoPoint[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = calculateDistance(
        points[i].lat,
        points[i].lng,
        points[j].lat,
        points[j].lng
      );
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
}

/**
 * Compute distances from a single origin to all points.
 */
export function computeDistancesFromOrigin(
  origin: { lat: number; lng: number },
  points: GeoPoint[]
): number[] {
  return points.map(p => calculateDistance(origin.lat, origin.lng, p.lat, p.lng));
}

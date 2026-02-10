export interface Point {
  lat: number;
  lng: number;
}

/**
 * Compute the convex hull of a set of 2D points using Graham Scan.
 * Returns points in counter-clockwise order.
 * For <= 2 points, returns the input as-is (not enough for a polygon).
 */
export function computeConvexHull(points: Point[]): Point[] {
  if (points.length <= 2) return [...points];

  // Remove duplicate points
  const unique = points.filter(
    (p, i, arr) => arr.findIndex(q => q.lat === p.lat && q.lng === p.lng) === i
  );

  if (unique.length <= 2) return [...unique];

  // Find the bottom-most point (lowest lat, then leftmost lng)
  let pivot = unique[0];
  for (let i = 1; i < unique.length; i++) {
    if (unique[i].lat < pivot.lat || (unique[i].lat === pivot.lat && unique[i].lng < pivot.lng)) {
      pivot = unique[i];
    }
  }

  // Sort by polar angle relative to pivot
  const sorted = unique
    .filter(p => p !== pivot)
    .sort((a, b) => {
      const angleA = Math.atan2(a.lat - pivot.lat, a.lng - pivot.lng);
      const angleB = Math.atan2(b.lat - pivot.lat, b.lng - pivot.lng);
      if (angleA !== angleB) return angleA - angleB;
      // If same angle, closer point first
      const distA = (a.lat - pivot.lat) ** 2 + (a.lng - pivot.lng) ** 2;
      const distB = (b.lat - pivot.lat) ** 2 + (b.lng - pivot.lng) ** 2;
      return distA - distB;
    });

  const stack: Point[] = [pivot];

  for (const point of sorted) {
    // Remove points that make clockwise turns
    while (stack.length > 1 && cross(stack[stack.length - 2], stack[stack.length - 1], point) <= 0) {
      stack.pop();
    }
    stack.push(point);
  }

  return stack;
}

/** Cross product of vectors (O→A) and (O→B). Positive = counter-clockwise. */
function cross(o: Point, a: Point, b: Point): number {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
}

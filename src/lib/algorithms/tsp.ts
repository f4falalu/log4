/**
 * TSP (Travelling Salesman Problem) heuristics for route optimization.
 *
 * Given a distance matrix and a start index (warehouse), finds
 * a near-optimal visitation order that minimizes total distance.
 */

export interface TSPResult {
  order: number[];
  totalDistance: number;
}

/**
 * Nearest-neighbor heuristic.
 * Greedily visits the closest unvisited node at each step.
 * Fast (O(n^2)) but not globally optimal.
 */
export function nearestNeighborTSP(
  distanceMatrix: number[][],
  startIdx: number = 0
): TSPResult {
  const n = distanceMatrix.length;
  if (n === 0) return { order: [], totalDistance: 0 };
  if (n === 1) return { order: [0], totalDistance: 0 };

  const visited = new Set<number>([startIdx]);
  const order = [startIdx];
  let totalDistance = 0;
  let current = startIdx;

  while (visited.size < n) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (distanceMatrix[current][j] < nearestDist) {
        nearestDist = distanceMatrix[current][j];
        nearest = j;
      }
    }

    if (nearest === -1) break;

    visited.add(nearest);
    order.push(nearest);
    totalDistance += nearestDist;
    current = nearest;
  }

  return { order, totalDistance };
}

/**
 * 2-opt local search improvement.
 * Takes an existing route and iteratively reverses segments
 * to reduce total distance. Runs until no improvement found.
 */
export function twoOptImprove(
  distanceMatrix: number[][],
  initialOrder: number[]
): TSPResult {
  const order = [...initialOrder];
  const n = order.length;
  let improved = true;

  while (improved) {
    improved = false;

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const d1 =
          distanceMatrix[order[i - 1]][order[i]] +
          distanceMatrix[order[j]][order[(j + 1) % n] || order[j]];
        const d2 =
          distanceMatrix[order[i - 1]][order[j]] +
          distanceMatrix[order[i]][order[(j + 1) % n] || order[i]];

        if (d2 < d1) {
          // Reverse segment [i..j]
          let left = i;
          let right = j;
          while (left < right) {
            [order[left], order[right]] = [order[right], order[left]];
            left++;
            right--;
          }
          improved = true;
        }
      }
    }
  }

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < n - 1; i++) {
    totalDistance += distanceMatrix[order[i]][order[i + 1]];
  }

  return { order, totalDistance };
}

/**
 * Combined solver: nearest-neighbor + 2-opt improvement.
 * Provides a good balance of speed and solution quality.
 */
export function solveTSP(
  distanceMatrix: number[][],
  startIdx: number = 0
): TSPResult {
  const nn = nearestNeighborTSP(distanceMatrix, startIdx);
  const optimized = twoOptImprove(distanceMatrix, nn.order);
  return optimized;
}

import { calculateDistance } from '@/lib/routeOptimization';

export interface ClusterPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface ClusterResult {
  clusterId: number;
  centroid: { lat: number; lng: number };
  points: ClusterPoint[];
}

/**
 * K-means clustering for geographic points.
 * Groups facilities into k clusters by lat/lng proximity.
 */
export function kMeansClustering(
  points: ClusterPoint[],
  k: number,
  maxIterations: number = 100
): ClusterResult[] {
  if (points.length === 0) return [];
  if (k >= points.length) {
    return points.map((p, i) => ({
      clusterId: i,
      centroid: { lat: p.lat, lng: p.lng },
      points: [p],
    }));
  }

  // Initialize centroids using k-means++ heuristic
  const centroids = initializeCentroids(points, k);
  let assignments = new Array(points.length).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = points.map(p => {
      let minDist = Infinity;
      let closest = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = calculateDistance(p.lat, p.lng, centroids[c].lat, centroids[c].lng);
        if (dist < minDist) {
          minDist = dist;
          closest = c;
        }
      }
      return closest;
    });

    // Check convergence
    const converged = newAssignments.every((a, i) => a === assignments[i]);
    assignments = newAssignments;

    if (converged) break;

    // Recalculate centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        centroids[c] = {
          lat: clusterPoints.reduce((s, p) => s + p.lat, 0) / clusterPoints.length,
          lng: clusterPoints.reduce((s, p) => s + p.lng, 0) / clusterPoints.length,
        };
      }
    }
  }

  // Build result
  const clusters: ClusterResult[] = [];
  for (let c = 0; c < k; c++) {
    const clusterPoints = points.filter((_, i) => assignments[i] === c);
    if (clusterPoints.length > 0) {
      clusters.push({
        clusterId: c,
        centroid: centroids[c],
        points: clusterPoints,
      });
    }
  }

  return clusters;
}

/**
 * DBSCAN: Density-Based Spatial Clustering.
 * Good for irregular facility distributions (e.g., rural areas).
 *
 * @param epsilon - Maximum distance (km) between two points in the same cluster
 * @param minPoints - Minimum points required to form a dense region
 */
export function dbscanClustering(
  points: ClusterPoint[],
  epsilon: number,
  minPoints: number = 3
): ClusterResult[] {
  const n = points.length;
  const labels = new Array(n).fill(-1); // -1 = unvisited
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    const neighbors = regionQuery(points, i, epsilon);
    if (neighbors.length < minPoints) {
      labels[i] = -2; // Noise
      continue;
    }

    // Start new cluster
    labels[i] = clusterId;
    const seedSet = [...neighbors];
    let j = 0;

    while (j < seedSet.length) {
      const q = seedSet[j];
      if (labels[q] === -2) labels[q] = clusterId; // Change noise to border point
      if (labels[q] !== -1) { j++; continue; }

      labels[q] = clusterId;
      const qNeighbors = regionQuery(points, q, epsilon);
      if (qNeighbors.length >= minPoints) {
        for (const nb of qNeighbors) {
          if (!seedSet.includes(nb)) seedSet.push(nb);
        }
      }
      j++;
    }

    clusterId++;
  }

  // Build clusters
  const clusterMap = new Map<number, ClusterPoint[]>();
  const noisePoints: ClusterPoint[] = [];

  for (let i = 0; i < n; i++) {
    if (labels[i] >= 0) {
      if (!clusterMap.has(labels[i])) clusterMap.set(labels[i], []);
      clusterMap.get(labels[i])!.push(points[i]);
    } else {
      noisePoints.push(points[i]);
    }
  }

  const results: ClusterResult[] = [];
  clusterMap.forEach((clusterPoints, cId) => {
    results.push({
      clusterId: cId,
      centroid: {
        lat: clusterPoints.reduce((s, p) => s + p.lat, 0) / clusterPoints.length,
        lng: clusterPoints.reduce((s, p) => s + p.lng, 0) / clusterPoints.length,
      },
      points: clusterPoints,
    });
  });

  // Assign noise points to nearest cluster (or make separate single-point clusters)
  if (noisePoints.length > 0 && results.length > 0) {
    for (const noise of noisePoints) {
      let minDist = Infinity;
      let closestCluster = results[0];
      for (const cluster of results) {
        const dist = calculateDistance(noise.lat, noise.lng, cluster.centroid.lat, cluster.centroid.lng);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = cluster;
        }
      }
      closestCluster.points.push(noise);
    }
  } else if (noisePoints.length > 0) {
    // All points are noise — put each in its own cluster
    noisePoints.forEach((p, i) => {
      results.push({
        clusterId: i,
        centroid: { lat: p.lat, lng: p.lng },
        points: [p],
      });
    });
  }

  return results;
}

// ─── Helpers ───

function initializeCentroids(
  points: ClusterPoint[],
  k: number
): { lat: number; lng: number }[] {
  // K-means++ initialization
  const centroids: { lat: number; lng: number }[] = [];
  const firstIdx = Math.floor(Math.random() * points.length);
  centroids.push({ lat: points[firstIdx].lat, lng: points[firstIdx].lng });

  for (let c = 1; c < k; c++) {
    const distances = points.map(p => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = calculateDistance(p.lat, p.lng, centroid.lat, centroid.lng);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    });

    const totalDist = distances.reduce((s, d) => s + d, 0);
    let threshold = Math.random() * totalDist;
    let selectedIdx = 0;

    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        selectedIdx = i;
        break;
      }
    }

    centroids.push({ lat: points[selectedIdx].lat, lng: points[selectedIdx].lng });
  }

  return centroids;
}

function regionQuery(points: ClusterPoint[], pointIdx: number, epsilon: number): number[] {
  const neighbors: number[] = [];
  const p = points[pointIdx];
  for (let i = 0; i < points.length; i++) {
    if (i === pointIdx) continue;
    const dist = calculateDistance(p.lat, p.lng, points[i].lat, points[i].lng);
    if (dist <= epsilon) neighbors.push(i);
  }
  return neighbors;
}

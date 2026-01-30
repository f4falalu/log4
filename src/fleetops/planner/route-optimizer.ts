/**
 * =====================================================
 * ROUTE OPTIMIZER
 * =====================================================
 *
 * Optimizes delivery routes.
 * Does NOT modify batch composition.
 */

import type {
  RoutePoint,
  OptimizedRoute,
  RouteOptimizationRequest,
} from './types';

/**
 * Optimize route using nearest-neighbor algorithm.
 */
export function optimizeRouteNearestNeighbor(
  request: RouteOptimizationRequest
): OptimizedRoute {
  const { batch_id, facility_locations, warehouse_location } = request;

  const points: RoutePoint[] = [];
  const unvisited = [...facility_locations];
  let currentLat = warehouse_location.lat;
  let currentLng = warehouse_location.lng;
  let totalDistance = 0;

  while (unvisited.length > 0) {
    // Find nearest unvisited facility
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(
        currentLat,
        currentLng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = unvisited[nearestIdx];
    totalDistance += nearestDist;

    points.push({
      lat: nearest.lat,
      lng: nearest.lng,
      facility_id: nearest.facility_id,
      sequence: points.length + 1,
      distance_from_previous_km: nearestDist,
    });

    currentLat = nearest.lat;
    currentLng = nearest.lng;
    unvisited.splice(nearestIdx, 1);
  }

  // Add distance back to warehouse
  const returnDistance = calculateDistance(
    currentLat,
    currentLng,
    warehouse_location.lat,
    warehouse_location.lng
  );
  totalDistance += returnDistance;

  // Estimate duration: 30 km/h average + 20 min per stop
  const travelTimeMin = (totalDistance / 30) * 60;
  const serviceTimeMin = points.length * 20;
  const estimatedDuration = Math.round(travelTimeMin + serviceTimeMin);

  return {
    route_id: generateRouteId(),
    batch_id,
    points,
    total_distance_km: Math.round(totalDistance * 10) / 10,
    estimated_duration_min: estimatedDuration,
    optimization_method: 'nearest-neighbor',
    created_at: new Date().toISOString(),
  };
}

/**
 * Optimize route with manual sequence.
 */
export function createManualRoute(
  request: RouteOptimizationRequest,
  sequenceOrder: string[] // facility_ids in desired order
): OptimizedRoute {
  const { batch_id, facility_locations, warehouse_location } = request;

  // Build location map
  const locationMap = new Map(
    facility_locations.map((f) => [f.facility_id, { lat: f.lat, lng: f.lng }])
  );

  const points: RoutePoint[] = [];
  let currentLat = warehouse_location.lat;
  let currentLng = warehouse_location.lng;
  let totalDistance = 0;

  for (let i = 0; i < sequenceOrder.length; i++) {
    const facilityId = sequenceOrder[i];
    const location = locationMap.get(facilityId);

    if (!location) continue;

    const distance = calculateDistance(
      currentLat,
      currentLng,
      location.lat,
      location.lng
    );
    totalDistance += distance;

    points.push({
      lat: location.lat,
      lng: location.lng,
      facility_id: facilityId,
      sequence: i + 1,
      distance_from_previous_km: distance,
    });

    currentLat = location.lat;
    currentLng = location.lng;
  }

  // Add distance back to warehouse
  const returnDistance = calculateDistance(
    currentLat,
    currentLng,
    warehouse_location.lat,
    warehouse_location.lng
  );
  totalDistance += returnDistance;

  const travelTimeMin = (totalDistance / 30) * 60;
  const serviceTimeMin = points.length * 20;
  const estimatedDuration = Math.round(travelTimeMin + serviceTimeMin);

  return {
    route_id: generateRouteId(),
    batch_id,
    points,
    total_distance_km: Math.round(totalDistance * 10) / 10,
    estimated_duration_min: estimatedDuration,
    optimization_method: 'manual',
    created_at: new Date().toISOString(),
  };
}

/**
 * Calculate route metrics without optimization.
 */
export function calculateRouteMetrics(
  facilityLocations: Array<{ facility_id: string; lat: number; lng: number }>,
  warehouseLocation: { lat: number; lng: number }
): { total_distance_km: number; estimated_duration_min: number } {
  let totalDistance = 0;
  let currentLat = warehouseLocation.lat;
  let currentLng = warehouseLocation.lng;

  for (const facility of facilityLocations) {
    totalDistance += calculateDistance(
      currentLat,
      currentLng,
      facility.lat,
      facility.lng
    );
    currentLat = facility.lat;
    currentLng = facility.lng;
  }

  // Return to warehouse
  totalDistance += calculateDistance(
    currentLat,
    currentLng,
    warehouseLocation.lat,
    warehouseLocation.lng
  );

  const travelTimeMin = (totalDistance / 30) * 60;
  const serviceTimeMin = facilityLocations.length * 20;

  return {
    total_distance_km: Math.round(totalDistance * 10) / 10,
    estimated_duration_min: Math.round(travelTimeMin + serviceTimeMin),
  };
}

/**
 * Add ETAs to route points.
 */
export function addETAsToRoute(
  route: OptimizedRoute,
  dispatchTime: string
): OptimizedRoute {
  let currentTime = new Date(dispatchTime);
  const pointsWithETA: RoutePoint[] = [];

  for (const point of route.points) {
    // Travel time (30 km/h average)
    if (point.distance_from_previous_km) {
      const travelMin = (point.distance_from_previous_km / 30) * 60;
      currentTime = new Date(currentTime.getTime() + travelMin * 60 * 1000);
    }

    pointsWithETA.push({
      ...point,
      eta: currentTime.toISOString(),
    });

    // Service time (20 min)
    currentTime = new Date(currentTime.getTime() + 20 * 60 * 1000);
  }

  return {
    ...route,
    points: pointsWithETA,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate distance between two points (Haversine formula).
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function generateRouteId(): string {
  return `ROUTE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

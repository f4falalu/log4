// MOD4 ETA & Route Optimization Utilities
// Real-time ETA calculations and route optimization

import { Facility, Slot } from '@/lib/db/schema';
import { GpsPosition } from './telemetry';

// Haversine distance in meters
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate ETA in minutes based on distance and speed
export function calculateETA(
  currentPosition: GpsPosition | null,
  facility: Facility,
  averageSpeedMps: number = 8.33 // Default ~30 km/h in urban areas
): { distanceMeters: number; etaMinutes: number } | null {
  if (!currentPosition) return null;

  const distanceMeters = haversineDistance(
    currentPosition.lat,
    currentPosition.lng,
    facility.lat,
    facility.lng
  );

  // Use current speed if available and reasonable, otherwise use average
  let speedMps = averageSpeedMps;
  if (currentPosition.speed !== null && currentPosition.speed > 1) {
    // Speed is in m/s, use it if > 1 m/s (walking speed)
    speedMps = currentPosition.speed;
  }

  // Apply road factor (straight-line distance vs actual road ~1.3x)
  const roadFactor = 1.3;
  const estimatedRoadDistance = distanceMeters * roadFactor;

  // Calculate time in minutes
  const etaMinutes = Math.round(estimatedRoadDistance / speedMps / 60);

  return {
    distanceMeters: Math.round(distanceMeters),
    etaMinutes: Math.max(1, etaMinutes), // Minimum 1 minute
  };
}

// Calculate cumulative ETA for multiple stops
export function calculateCumulativeETA(
  currentPosition: GpsPosition | null,
  facilities: Facility[],
  startIndex: number,
  stopDurationMinutes: number = 5 // Average time spent at each stop
): Map<string, { distanceMeters: number; etaMinutes: number }> {
  const etaMap = new Map<string, { distanceMeters: number; etaMinutes: number }>();
  
  if (!currentPosition || facilities.length === 0) return etaMap;

  let cumulativeMinutes = 0;
  let cumulativeDistance = 0;
  let lastPosition = { lat: currentPosition.lat, lng: currentPosition.lng };

  for (let i = startIndex; i < facilities.length; i++) {
    const facility = facilities[i];
    
    const distance = haversineDistance(
      lastPosition.lat,
      lastPosition.lng,
      facility.lat,
      facility.lng
    );

    // Use GPS speed for first segment, average for subsequent
    let speedMps = 8.33; // ~30 km/h default
    if (i === startIndex && currentPosition.speed !== null && currentPosition.speed > 1) {
      speedMps = currentPosition.speed;
    }

    const roadFactor = 1.3;
    const estimatedRoadDistance = distance * roadFactor;
    const segmentMinutes = estimatedRoadDistance / speedMps / 60;

    cumulativeMinutes += segmentMinutes;
    cumulativeDistance += distance;

    etaMap.set(facility.id, {
      distanceMeters: Math.round(cumulativeDistance),
      etaMinutes: Math.max(1, Math.round(cumulativeMinutes)),
    });

    // Add stop duration for subsequent calculations
    cumulativeMinutes += stopDurationMinutes;
    lastPosition = { lat: facility.lat, lng: facility.lng };
  }

  return etaMap;
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Format ETA for display
export function formatETA(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// ============================================
// ROUTE OPTIMIZATION
// ============================================

export interface OptimizationResult {
  optimizedOrder: string[]; // facility IDs in optimized order
  totalDistance: number;
  savedDistance: number;
  savedPercentage: number;
}

// Calculate total route distance for a given order
export function calculateTotalRouteDistance(
  startPosition: { lat: number; lng: number },
  facilities: Facility[],
  facilityOrder: string[]
): number {
  let totalDistance = 0;
  let currentPos = startPosition;

  for (const facilityId of facilityOrder) {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) continue;

    totalDistance += haversineDistance(
      currentPos.lat,
      currentPos.lng,
      facility.lat,
      facility.lng
    );
    currentPos = { lat: facility.lat, lng: facility.lng };
  }

  return totalDistance;
}

// Nearest Neighbor algorithm for route optimization
// Greedy approach: always pick the closest unvisited facility
export function optimizeRouteNearestNeighbor(
  startPosition: { lat: number; lng: number },
  facilities: Facility[]
): string[] {
  if (facilities.length <= 1) {
    return facilities.map((f) => f.id);
  }

  const optimizedOrder: string[] = [];
  const unvisited = new Set(facilities.map((f) => f.id));
  let currentPos = startPosition;

  while (unvisited.size > 0) {
    let nearestId: string | null = null;
    let nearestDistance = Infinity;

    for (const facilityId of unvisited) {
      const facility = facilities.find((f) => f.id === facilityId);
      if (!facility) continue;

      const distance = haversineDistance(
        currentPos.lat,
        currentPos.lng,
        facility.lat,
        facility.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = facilityId;
      }
    }

    if (nearestId) {
      optimizedOrder.push(nearestId);
      unvisited.delete(nearestId);
      const facility = facilities.find((f) => f.id === nearestId);
      if (facility) {
        currentPos = { lat: facility.lat, lng: facility.lng };
      }
    }
  }

  return optimizedOrder;
}

// 2-opt improvement for route optimization
// Tries to improve the route by reversing segments
export function improve2Opt(
  startPosition: { lat: number; lng: number },
  facilities: Facility[],
  initialOrder: string[]
): string[] {
  if (initialOrder.length <= 2) return initialOrder;

  let bestOrder = [...initialOrder];
  let bestDistance = calculateTotalRouteDistance(startPosition, facilities, bestOrder);
  let improved = true;

  while (improved) {
    improved = false;

    for (let i = 0; i < bestOrder.length - 1; i++) {
      for (let j = i + 2; j < bestOrder.length; j++) {
        // Create new order by reversing segment between i and j
        const newOrder = [
          ...bestOrder.slice(0, i + 1),
          ...bestOrder.slice(i + 1, j + 1).reverse(),
          ...bestOrder.slice(j + 1),
        ];

        const newDistance = calculateTotalRouteDistance(startPosition, facilities, newOrder);

        if (newDistance < bestDistance) {
          bestOrder = newOrder;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return bestOrder;
}

// Full route optimization combining nearest neighbor + 2-opt
export function optimizeRoute(
  currentPosition: GpsPosition | null,
  facilities: Facility[],
  slots: Slot[]
): OptimizationResult | null {
  if (!currentPosition || facilities.length === 0) return null;

  // Only optimize pending facilities (not completed or active)
  const pendingFacilities = facilities.filter((f) => {
    const slot = slots.find((s) => s.facility_id === f.id);
    return slot?.status === 'pending';
  });

  if (pendingFacilities.length <= 1) return null;

  const startPos = { lat: currentPosition.lat, lng: currentPosition.lng };

  // Get current order
  const currentOrder = pendingFacilities
    .sort((a, b) => {
      const slotA = slots.find((s) => s.facility_id === a.id);
      const slotB = slots.find((s) => s.facility_id === b.id);
      return (slotA?.sequence || 0) - (slotB?.sequence || 0);
    })
    .map((f) => f.id);

  const currentDistance = calculateTotalRouteDistance(startPos, pendingFacilities, currentOrder);

  // Apply nearest neighbor + 2-opt optimization
  const nnOrder = optimizeRouteNearestNeighbor(startPos, pendingFacilities);
  const optimizedOrder = improve2Opt(startPos, pendingFacilities, nnOrder);
  const optimizedDistance = calculateTotalRouteDistance(startPos, pendingFacilities, optimizedOrder);

  const savedDistance = currentDistance - optimizedDistance;
  const savedPercentage = currentDistance > 0 ? (savedDistance / currentDistance) * 100 : 0;

  return {
    optimizedOrder,
    totalDistance: optimizedDistance,
    savedDistance: Math.max(0, savedDistance),
    savedPercentage: Math.max(0, savedPercentage),
  };
}

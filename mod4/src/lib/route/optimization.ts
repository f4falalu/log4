// Route Optimization Utilities
// Uses nearest-neighbor algorithm starting from warehouse

import { Facility, FacilityType } from '@/lib/db/schema';

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Optimize route using nearest-neighbor algorithm
 * Starts from warehouse, visits nearest unvisited facility, repeats
 */
export function optimizeRoute(facilities: Facility[]): Facility[] {
  if (facilities.length <= 2) return facilities;

  // Find warehouse(s) - they should be first
  const warehouses = facilities.filter(f => f.type === 'warehouse');
  const nonWarehouses = facilities.filter(f => f.type !== 'warehouse');

  if (nonWarehouses.length === 0) return warehouses;

  // Start from first warehouse (or first facility if no warehouse)
  const startingPoint = warehouses[0] || nonWarehouses[0];
  
  // Apply nearest-neighbor to non-warehouse facilities
  const optimized: Facility[] = [...warehouses];
  const remaining = warehouses.length > 0 
    ? [...nonWarehouses] 
    : nonWarehouses.slice(1);
  
  if (warehouses.length === 0 && nonWarehouses.length > 0) {
    optimized.push(nonWarehouses[0]);
  }

  let currentPoint = startingPoint;

  while (remaining.length > 0) {
    // Find nearest facility
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((facility, index) => {
      const distance = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        facility.lat,
        facility.lng
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    // Move to nearest
    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentPoint = nearest;
  }

  return optimized;
}

/**
 * Calculate total route distance in km
 */
export function calculateTotalDistance(facilities: Facility[]): number {
  if (facilities.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < facilities.length - 1; i++) {
    totalDistance += haversineDistance(
      facilities[i].lat,
      facilities[i].lng,
      facilities[i + 1].lat,
      facilities[i + 1].lng
    );
  }
  return totalDistance;
}

/**
 * Estimate total travel time based on distance
 * Assumes average speed of 30 km/h in urban areas
 */
export function estimateTravelTime(distanceKm: number): number {
  const avgSpeedKmH = 30;
  return Math.round((distanceKm / avgSpeedKmH) * 60); // minutes
}

/**
 * Format distance for display
 */
export function formatRouteDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format travel time for display
 */
export function formatRouteDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Get optimization stats comparing original vs optimized route
 */
export function getOptimizationStats(
  original: Facility[],
  optimized: Facility[]
): {
  originalDistance: number;
  optimizedDistance: number;
  savedDistance: number;
  savedPercent: number;
  estimatedTime: number;
} {
  const originalDistance = calculateTotalDistance(original);
  const optimizedDistance = calculateTotalDistance(optimized);
  const savedDistance = originalDistance - optimizedDistance;
  const savedPercent = originalDistance > 0 
    ? Math.round((savedDistance / originalDistance) * 100) 
    : 0;

  return {
    originalDistance,
    optimizedDistance,
    savedDistance,
    savedPercent,
    estimatedTime: estimateTravelTime(optimizedDistance),
  };
}

import { Facility, Warehouse, RouteOptimization } from '@/types';

// Calculate distance between two points using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Find the optimal warehouse for a facility
export function findOptimalWarehouse(facility: Facility, warehouses: Warehouse[]): Warehouse {
  let optimalWarehouse = warehouses[0];
  let minDistance = calculateDistance(
    facility.lat,
    facility.lng,
    warehouses[0].lat,
    warehouses[0].lng
  );

  for (let i = 1; i < warehouses.length; i++) {
    const distance = calculateDistance(
      facility.lat,
      facility.lng,
      warehouses[i].lat,
      warehouses[i].lng
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      optimalWarehouse = warehouses[i];
    }
  }

  return optimalWarehouse;
}

// Simple nearest neighbor route optimization
export function optimizeRoutes(facilities: Facility[], warehouses: Warehouse[]): RouteOptimization[] {
  const routesByWarehouse: { [warehouseId: string]: RouteOptimization } = {};

  // Initialize routes for each warehouse
  warehouses.forEach(warehouse => {
    routesByWarehouse[warehouse.id] = {
      warehouseId: warehouse.id,
      facilities: [],
      totalDistance: 0,
      estimatedDuration: 0
    };
  });

  // Assign each facility to its nearest warehouse
  facilities.forEach(facility => {
    const optimalWarehouse = findOptimalWarehouse(facility, warehouses);
    const distance = calculateDistance(
      facility.lat,
      facility.lng,
      optimalWarehouse.lat,
      optimalWarehouse.lng
    );

    routesByWarehouse[optimalWarehouse.id].facilities.push(facility);
    routesByWarehouse[optimalWarehouse.id].totalDistance += distance;
    // Estimate 30 minutes per facility + travel time (assuming 40 km/h average)
    routesByWarehouse[optimalWarehouse.id].estimatedDuration += 30 + (distance / 40) * 60;
  });

  return Object.values(routesByWarehouse).filter(route => route.facilities.length > 0);
}

// Calculate route between multiple points (warehouse -> facilities)
export function calculateRouteCoordinates(warehouse: Warehouse, facilities: Facility[]): [number, number][] {
  const route: [number, number][] = [[warehouse.lat, warehouse.lng]];
  
  // Simple nearest neighbor ordering
  const unvisited = [...facilities];
  let current: { lat: number; lng: number } = warehouse;
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(current.lat, current.lng, unvisited[0].lat, unvisited[0].lng);
    
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push([nearest.lat, nearest.lng]);
    current = nearest;
  }
  
  return route;
}
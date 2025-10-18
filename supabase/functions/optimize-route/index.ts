import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeRouteRequest {
  waypoints: Array<{ lat: number; lng: number }>;
  vehicle_type?: string;
  constraints?: {
    avoid_highways?: boolean;
    avoid_tolls?: boolean;
    prefer_shortest?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waypoints, vehicle_type = 'car', constraints = {} }: OptimizeRouteRequest = await req.json();

    console.log('Route optimization request:', { waypoints: waypoints.length, vehicle_type });

    // For now, use client-side nearest neighbor algorithm
    // In production, this would call GraphHopper or similar API
    const optimizedRoute = optimizeWithNearestNeighbor(waypoints);
    const totalDistance = calculateTotalDistance(optimizedRoute);
    const estimatedTime = calculateEstimatedTime(totalDistance, vehicle_type);

    const response = {
      success: true,
      route: {
        coordinates: optimizedRoute,
        distance_km: Math.round(totalDistance * 100) / 100,
        estimated_minutes: Math.round(estimatedTime),
        vehicle_type,
        optimization_method: 'nearest_neighbor',
        constraints
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function optimizeWithNearestNeighbor(
  waypoints: Array<{ lat: number; lng: number }>
): Array<{ lat: number; lng: number }> {
  if (waypoints.length <= 1) return waypoints;

  const route: Array<{ lat: number; lng: number }> = [waypoints[0]];
  const unvisited = waypoints.slice(1);

  while (unvisited.length > 0) {
    const current = route[route.length - 1];
    let nearestIndex = 0;
    let minDistance = calculateDistance(current, unvisited[0]);

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(current, unvisited[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    route.push(unvisited[nearestIndex]);
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTotalDistance(route: Array<{ lat: number; lng: number }>): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += calculateDistance(route[i - 1], route[i]);
  }
  return total;
}

function calculateEstimatedTime(distanceKm: number, vehicleType: string): number {
  const avgSpeed = vehicleType === 'truck' ? 40 : 50; // km/h
  const serviceTimePerStop = 20; // minutes
  const travelTime = (distanceKm / avgSpeed) * 60;
  return travelTime + (serviceTimePerStop * 2); // Assuming 2 stops average
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Point {
  lat: number;
  lng: number;
}

interface ServiceZone {
  id: string;
  name: string;
  geometry: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[][][];
    };
  };
}

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point: Point, polygon: number[][]): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { driver_id, current_location, previous_location } = await req.json();

    if (!driver_id || !current_location) {
      return new Response(
        JSON.stringify({ error: 'driver_id and current_location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active service zones
    const { data: zones, error: zonesError } = await supabaseClient
      .from('service_zones')
      .select('*')
      .eq('is_active', true);

    if (zonesError) throw zonesError;

    const currentPoint: Point = { lat: current_location.lat, lng: current_location.lng };
    const previousPoint: Point | null = previous_location
      ? { lat: previous_location.lat, lng: previous_location.lng }
      : null;

    const notifications = [];

    // Check each zone for entry/exit
    for (const zone of zones as ServiceZone[]) {
      const polygon = zone.geometry.geometry.coordinates[0];
      const isCurrentlyInside = isPointInPolygon(currentPoint, polygon);
      const wasPreviouslyInside = previousPoint ? isPointInPolygon(previousPoint, polygon) : false;

      // Entered zone
      if (isCurrentlyInside && !wasPreviouslyInside) {
        notifications.push({
          type: 'zone_entry',
          zone_id: zone.id,
          zone_name: zone.name,
          message: `Driver entered ${zone.name}`,
        });

        // Create notification for driver
        await supabaseClient.from('notifications').insert({
          user_id: driver_id,
          type: 'geofence_alert',
          title: 'Zone Entry',
          message: `You have entered ${zone.name}`,
          related_entity_type: 'service_zone',
          related_entity_id: zone.id,
        });
      }

      // Exited zone
      if (!isCurrentlyInside && wasPreviouslyInside) {
        notifications.push({
          type: 'zone_exit',
          zone_id: zone.id,
          zone_name: zone.name,
          message: `Driver exited ${zone.name}`,
        });

        // Create notification for driver
        await supabaseClient.from('notifications').insert({
          user_id: driver_id,
          type: 'geofence_alert',
          title: 'Zone Exit',
          message: `You have left ${zone.name}`,
          related_entity_type: 'service_zone',
          related_entity_id: zone.id,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, notifications }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking geofencing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

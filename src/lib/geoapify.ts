import { supabase } from '@/integrations/supabase/client';

export interface GeoapifyPlace {
  formatted: string;
  lat: number;
  lon: number;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface GeoapifyRoute {
  distance: number; // in meters
  time: number; // in seconds
  geometry: Array<[number, number]>; // [lng, lat] pairs
  legs: Array<{
    distance: number;
    time: number;
    steps: Array<{
      distance: number;
      time: number;
      instruction: string;
    }>;
  }>;
}

export async function searchAddress(query: string): Promise<GeoapifyPlace[]> {
  try {
    // Use secure Supabase edge function proxy
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: {
        type: 'search',
        query
      }
    });

    if (error) throw error;

    if (data && data.features && data.features.length > 0) {
      return data.features.map((feature: any) => ({
        formatted: feature.properties.formatted,
        lat: feature.properties.lat,
        lon: feature.properties.lon,
        address_line1: feature.properties.address_line1 || '',
        address_line2: feature.properties.address_line2,
        city: feature.properties.city,
        state: feature.properties.state,
        postcode: feature.properties.postcode,
        country: feature.properties.country
      }));
    }
  } catch (error) {
    console.error('Geoapify search error:', error);
  }

  // Fallback to Nominatim (OpenStreetMap) — no API key required
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );

    if (!response.ok) throw new Error('Nominatim search failed');

    const data = await response.json();
    return data.map((item: any) => ({
      formatted: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address_line1: item.address?.road || item.name || item.display_name.split(',')[0],
      address_line2: undefined,
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state,
      postcode: item.address?.postcode,
      country: item.address?.country,
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoapifyPlace | null> {
  try {
    // Use secure Supabase edge function proxy
    const { data, error } = await supabase.functions.invoke('geocode', {
      body: {
        type: 'reverse',
        lat,
        lon
      }
    });

    if (error) throw error;

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        formatted: feature.properties.formatted,
        lat: feature.properties.lat,
        lon: feature.properties.lon,
        address_line1: feature.properties.address_line1 || '',
        address_line2: feature.properties.address_line2,
        city: feature.properties.city,
        state: feature.properties.state,
        postcode: feature.properties.postcode,
        country: feature.properties.country
      };
    }

    return null;
  } catch (error) {
    console.error('Geoapify reverse geocode error:', error);
    return null;
  }
}

export async function getRoute(waypoints: Array<[number, number]>): Promise<GeoapifyRoute | null> {
  if (waypoints.length < 2) return null;

  try {
    // Convert waypoints from [lat, lon] to { lat, lon } format for edge function
    const waypointsFormatted = waypoints.map(([lat, lon]) => ({ lat, lon }));

    // Use secure Supabase edge function proxy
    const { data, error } = await supabase.functions.invoke('routing', {
      body: {
        waypoints: waypointsFormatted,
        mode: 'drive'
      }
    });

    if (error) throw error;

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const properties = feature.properties;

      return {
        distance: properties.distance,
        time: properties.time,
        geometry: feature.geometry.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]),
        legs: properties.legs || []
      };
    }

    return null;
  } catch (error) {
    console.error('Geoapify routing error:', error);
    return null;
  }
}

export async function getIsochrone(
  lat: number,
  lon: number,
  timeMinutes: number
): Promise<any> {
  try {
    // Use secure Supabase edge function proxy
    const { data, error } = await supabase.functions.invoke('isoline', {
      body: {
        lat,
        lon,
        type: 'time',
        mode: 'drive',
        range: timeMinutes * 60 // Convert minutes to seconds
      }
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Geoapify isochrone error:', error);
    return null;
  }
}

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

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
  if (!GEOAPIFY_API_KEY) {
    console.warn('Geoapify API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5`
    );
    
    if (!response.ok) throw new Error('Failed to search address');
    
    const data = await response.json();
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
  } catch (error) {
    console.error('Geoapify search error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoapifyPlace | null> {
  if (!GEOAPIFY_API_KEY) {
    console.warn('Geoapify API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to reverse geocode');
    
    const data = await response.json();
    if (data.features.length === 0) return null;
    
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
  } catch (error) {
    console.error('Geoapify reverse geocode error:', error);
    return null;
  }
}

export async function getRoute(waypoints: Array<[number, number]>): Promise<GeoapifyRoute | null> {
  if (!GEOAPIFY_API_KEY) {
    console.warn('Geoapify API key not configured');
    return null;
  }

  if (waypoints.length < 2) return null;

  try {
    const waypointsParam = waypoints.map(([lat, lon]) => `${lon},${lat}`).join('|');
    const response = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=drive&apiKey=${GEOAPIFY_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to get route');
    
    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;
    
    const feature = data.features[0];
    const properties = feature.properties;
    
    return {
      distance: properties.distance,
      time: properties.time,
      geometry: feature.geometry.coordinates[0].map((coord: number[]) => [coord[0], coord[1]]),
      legs: properties.legs || []
    };
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
  if (!GEOAPIFY_API_KEY) {
    console.warn('Geoapify API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/isoline?lat=${lat}&lon=${lon}&type=time&mode=drive&range=${timeMinutes * 60}&apiKey=${GEOAPIFY_API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to get isochrone');
    
    return await response.json();
  } catch (error) {
    console.error('Geoapify isochrone error:', error);
    return null;
  }
}

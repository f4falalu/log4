// Geoapify Geocoding Proxy
// This edge function proxies geocoding requests to protect the API key
// Deploy with: supabase functions deploy geocode

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface GeocodeRequest {
  query?: string;
  lat?: number;
  lon?: number;
  type: 'search' | 'reverse';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEOAPIFY_API_KEY = Deno.env.get('GEOAPIFY_API_KEY')
    if (!GEOAPIFY_API_KEY) {
      throw new Error('GEOAPIFY_API_KEY not configured')
    }

    const { query, lat, lon, type }: GeocodeRequest = await req.json()

    let url: string;

    if (type === 'search' && query) {
      // Forward geocoding (address → coordinates)
      url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=5`
    } else if (type === 'reverse' && lat && lon) {
      // Reverse geocoding (coordinates → address)
      url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}`
    } else {
      throw new Error('Invalid request parameters')
    }

    // Call Geoapify API with server-side key (as query parameter)
    const urlWithKey = `${url}&apiKey=${GEOAPIFY_API_KEY}`
    const response = await fetch(urlWithKey)

    if (!response.ok) {
      throw new Error(`Geoapify API error: ${response.statusText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Geocode function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

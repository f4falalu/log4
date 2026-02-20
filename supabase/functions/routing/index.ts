// Geoapify Routing Proxy
// This edge function proxies routing requests to protect the API key
// Deploy with: supabase functions deploy routing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface RoutingRequest {
  waypoints: Array<{ lat: number; lon: number }>;
  mode?: string;
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

    const { waypoints, mode = 'drive' }: RoutingRequest = await req.json()

    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required')
    }

    // Format waypoints for Geoapify API
    const waypointsParam = waypoints
      .map(w => `${w.lat},${w.lon}`)
      .join('|')

    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=${mode}`

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
    console.error('Routing function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

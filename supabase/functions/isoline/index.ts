// Geoapify Isoline Proxy
// This edge function proxies isoline (service area) requests to protect the API key
// Deploy with: supabase functions deploy isoline

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface IsolineRequest {
  lat: number;
  lon: number;
  type?: 'time' | 'distance';
  mode?: string;
  range: number; // in seconds for time, in meters for distance
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

    const { lat, lon, type = 'time', mode = 'drive', range }: IsolineRequest = await req.json()

    if (!lat || !lon || !range) {
      throw new Error('lat, lon, and range are required')
    }

    const url = `https://api.geoapify.com/v1/isoline?lat=${lat}&lon=${lon}&type=${type}&mode=${mode}&range=${range}`

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
    console.error('Isoline function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

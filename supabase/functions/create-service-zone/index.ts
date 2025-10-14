import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { name, description, geometry, color, metadata } = await req.json();

    // Validate geometry
    if (!geometry || !geometry.type || geometry.type !== 'Feature') {
      throw new Error('Invalid GeoJSON geometry');
    }

    if (!geometry.geometry || geometry.geometry.type !== 'Polygon') {
      throw new Error('Only polygon geometries are supported');
    }

    // Check for self-intersection (basic validation)
    const coords = geometry.geometry.coordinates[0];
    if (coords.length < 4) {
      throw new Error('Polygon must have at least 4 coordinates');
    }

    // Create service zone
    const { data, error } = await supabase
      .from('service_zones')
      .insert({
        name,
        description,
        geometry,
        color: color || '#1D6AFF',
        created_by: user.id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Service zone created: ${data.id} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

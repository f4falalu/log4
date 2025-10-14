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

    const { zone_id, name, description, geometry, color, metadata } = await req.json();

    if (!zone_id) {
      throw new Error('Zone ID is required');
    }

    // Check permissions (must be creator or admin)
    const { data: zone, error: fetchError } = await supabase
      .from('service_zones')
      .select('created_by')
      .eq('id', zone_id)
      .single();

    if (fetchError) throw fetchError;

    // For now, only allow creator to edit (admin check would require role query)
    if (zone.created_by !== user.id) {
      throw new Error('Unauthorized to edit this zone');
    }

    // Validate geometry if provided
    if (geometry) {
      if (!geometry.type || geometry.type !== 'Feature') {
        throw new Error('Invalid GeoJSON geometry');
      }

      if (!geometry.geometry || geometry.geometry.type !== 'Polygon') {
        throw new Error('Only polygon geometries are supported');
      }

      const coords = geometry.geometry.coordinates[0];
      if (coords.length < 4) {
        throw new Error('Polygon must have at least 4 coordinates');
      }
    }

    // Update zone
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (geometry) updateData.geometry = geometry;
    if (color) updateData.color = color;
    if (metadata) updateData.metadata = metadata;

    const { data, error } = await supabase
      .from('service_zones')
      .update(updateData)
      .eq('id', zone_id)
      .select()
      .single();

    if (error) throw error;

    console.log(`Service zone updated: ${zone_id} by user ${user.id}`);

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

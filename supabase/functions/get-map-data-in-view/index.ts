
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  Deno.exit(1);
}

serve(async (req: Request) => {
  const { url } = req;
  const urlObject = new URL(url);
  const params = urlObject.searchParams;

  const min_lat = parseFloat(params.get('min_lat') || '0');
  const min_lon = parseFloat(params.get('min_lon') || '0');
  const max_lat = parseFloat(params.get('max_lat') || '0');
  const max_lon = parseFloat(params.get('max_lon') || '0');
  const zoom = parseInt(params.get('zoom') || '10');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { data, error } = await supabase.rpc('get_map_data_in_view', {
      min_lat,
      min_lon,
      max_lat,
      max_lon,
      zoom_level: zoom,
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching map data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

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

    const { 
      route_history_id, 
      status, 
      recipient_name, 
      notes,
      delay_reason 
    } = await req.json();

    const updates: any = { status };

    if (status === 'arrived') {
      updates.check_in_time = new Date().toISOString();
    } else if (status === 'completed') {
      updates.check_out_time = new Date().toISOString();
      if (recipient_name) updates.recipient_name = recipient_name;
    }

    if (notes) updates.notes = notes;
    if (delay_reason) updates.delay_reason = delay_reason;

    const { error } = await supabase
      .from('route_history')
      .update(updates)
      .eq('id', route_history_id);

    if (error) throw error;

    console.log(`Stop ${route_history_id} updated to status: ${status}`);

    return new Response(
      JSON.stringify({ success: true }),
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

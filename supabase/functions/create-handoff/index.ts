import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      from_vehicle_id, 
      to_vehicle_id, 
      from_batch_id, 
      location_lat, 
      location_lng, 
      scheduled_time,
      notes 
    } = await req.json();

    console.log('Creating handoff:', { from_vehicle_id, to_vehicle_id, from_batch_id });

    // Validate vehicles exist and are available
    const { data: fromVehicle } = await supabase
      .from('vehicles')
      .select('id, plate_number, status, current_driver_id')
      .eq('id', from_vehicle_id)
      .maybeSingle();

    if (!fromVehicle) {
      throw new Error('Source vehicle not found');
    }

    const { data: toVehicle } = await supabase
      .from('vehicles')
      .select('id, plate_number, status, current_driver_id')
      .eq('id', to_vehicle_id)
      .maybeSingle();

    if (!toVehicle) {
      throw new Error('Destination vehicle not found');
    }

    if (toVehicle.status !== 'available') {
      throw new Error('Destination vehicle is not available');
    }

    // Validate batch exists and is assigned to source vehicle
    const { data: batch } = await supabase
      .from('delivery_batches')
      .select('id, vehicle_id, name, status')
      .eq('id', from_batch_id)
      .maybeSingle();

    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.vehicle_id !== from_vehicle_id) {
      throw new Error('Batch is not assigned to source vehicle');
    }

    // Create handoff record
    const { data: handoff, error: handoffError } = await supabase
      .from('handoffs')
      .insert({
        from_vehicle_id,
        to_vehicle_id,
        from_batch_id,
        location_lat,
        location_lng,
        scheduled_time: scheduled_time || new Date().toISOString(),
        status: 'planned',
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (handoffError) {
      throw handoffError;
    }

    console.log('Handoff created:', handoff.id);

    // Send notifications to both drivers if they exist
    if (fromVehicle.current_driver_id) {
      await supabase.from('notifications').insert({
        user_id: fromVehicle.current_driver_id,
        type: 'handoff_scheduled',
        title: 'Handoff Scheduled',
        message: `You have a handoff scheduled for batch ${batch.name} to vehicle ${toVehicle.plate_number}`,
        related_entity_type: 'handoff',
        related_entity_id: handoff.id,
      });
    }

    if (toVehicle.current_driver_id) {
      await supabase.from('notifications').insert({
        user_id: toVehicle.current_driver_id,
        type: 'handoff_scheduled',
        title: 'Incoming Handoff',
        message: `You will receive batch ${batch.name} from vehicle ${fromVehicle.plate_number}`,
        related_entity_type: 'handoff',
        related_entity_id: handoff.id,
      });
    }


    return new Response(
      JSON.stringify({ 
        success: true,
        handoff,
        message: 'Handoff created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating handoff:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

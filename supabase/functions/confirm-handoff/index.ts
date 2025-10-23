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

    const { handoff_id, actual_time } = await req.json();

    console.log('Confirming handoff:', handoff_id);

    // Get handoff details
    const { data: handoff } = await supabase
      .from('handoffs')
      .select('*')
      .eq('id', handoff_id)
      .maybeSingle();

    if (!handoff) {
      throw new Error('Handoff not found');
    }

    if (handoff.status === 'completed') {
      throw new Error('Handoff already completed');
    }

    if (handoff.status === 'cancelled') {
      throw new Error('Handoff was cancelled');
    }

    // Update handoff status
    const { error: updateHandoffError } = await supabase
      .from('handoffs')
      .update({
        status: 'completed',
        actual_time: actual_time || new Date().toISOString(),
      })
      .eq('id', handoff_id);

    if (updateHandoffError) {
      throw updateHandoffError;
    }

    console.log('Handoff status updated to completed');

    // Transfer batch to new vehicle
    const { error: transferError } = await supabase
      .from('delivery_batches')
      .update({ 
        vehicle_id: handoff.to_vehicle_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', handoff.from_batch_id);

    if (transferError) {
      throw transferError;
    }

    console.log('Batch transferred to new vehicle');

    // Get vehicle details for notifications
    const { data: fromVehicle } = await supabase
      .from('vehicles')
      .select('plate_number, current_driver_id')
      .eq('id', handoff.from_vehicle_id)
      .maybeSingle();

    const { data: toVehicle } = await supabase
      .from('vehicles')
      .select('plate_number, current_driver_id')
      .eq('id', handoff.to_vehicle_id)
      .maybeSingle();

    const { data: batch } = await supabase
      .from('delivery_batches')
      .select('name')
      .eq('id', handoff.from_batch_id)
      .maybeSingle();

    // Send completion notifications
    if (fromVehicle?.current_driver_id && batch && toVehicle) {
      await supabase.from('notifications').insert({
        user_id: fromVehicle.current_driver_id,
        type: 'handoff_completed',
        title: 'Handoff Completed',
        message: `Batch ${batch.name} has been handed off to vehicle ${toVehicle.plate_number}`,
        related_entity_type: 'handoff',
        related_entity_id: handoff_id,
      });
    }

    if (toVehicle?.current_driver_id && batch && fromVehicle) {
      await supabase.from('notifications').insert({
        user_id: toVehicle.current_driver_id,
        type: 'handoff_completed',
        title: 'Batch Received',
        message: `You have received batch ${batch.name} from vehicle ${fromVehicle.plate_number}`,
        related_entity_type: 'handoff',
        related_entity_id: handoff_id,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Handoff confirmed successfully',
        handoff_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error confirming handoff:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

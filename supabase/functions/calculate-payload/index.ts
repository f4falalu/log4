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

    const { batch_id, vehicle_id } = await req.json();

    if (!batch_id && !vehicle_id) {
      throw new Error('Either batch_id or vehicle_id is required');
    }

    console.log('Calculating payload for:', { batch_id, vehicle_id });

    let query = supabase.from('payload_items').select('*');
    
    if (batch_id) {
      query = query.eq('batch_id', batch_id);
    } else {
      // Get batch for vehicle
      const { data: batch } = await supabase
        .from('delivery_batches')
        .select('id')
        .eq('vehicle_id', vehicle_id)
        .eq('status', 'in-progress')
        .maybeSingle();
      
      if (!batch) {
        return new Response(
          JSON.stringify({ 
            total_weight_kg: 0,
            total_volume_m3: 0,
            utilization_pct: 0,
            item_count: 0,
            items: [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      query = query.eq('batch_id', batch.id);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      throw itemsError;
    }

    // Calculate totals
    const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => sum + (item.volume_m3 * item.quantity), 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    // Get vehicle capacity
    let utilizationPct = 0;
    let capacityWeight = 0;
    let capacityVolume = 0;

    if (vehicle_id || batch_id) {
      const { data: batch } = await supabase
        .from('delivery_batches')
        .select('vehicle_id')
        .eq('id', batch_id)
        .maybeSingle();

      const vehicleIdToUse = vehicle_id || batch?.vehicle_id;

      if (vehicleIdToUse) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('max_weight, capacity')
          .eq('id', vehicleIdToUse)
          .maybeSingle();

        if (vehicle) {
          capacityWeight = vehicle.max_weight;
          capacityVolume = vehicle.capacity;

          // Calculate utilization (use higher of weight or volume percentage)
          const weightPct = (totalWeight / capacityWeight) * 100;
          const volumePct = (totalVolume / capacityVolume) * 100;
          utilizationPct = Math.max(weightPct, volumePct);
        }
      }
    }

    // Update batch with calculated values
    if (batch_id) {
      await supabase
        .from('delivery_batches')
        .update({
          total_weight: totalWeight,
          total_volume: totalVolume,
          payload_utilization_pct: utilizationPct,
          total_quantity: itemCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batch_id);

      console.log('Batch updated with payload calculations');
    }

    const warnings = [];
    if (utilizationPct > 100) {
      warnings.push('Vehicle is overloaded');
    } else if (utilizationPct > 90) {
      warnings.push('Vehicle is near capacity');
    }

    return new Response(
      JSON.stringify({ 
        total_weight_kg: totalWeight,
        total_volume_m3: totalVolume,
        utilization_pct: utilizationPct,
        capacity_weight_kg: capacityWeight,
        capacity_volume_m3: capacityVolume,
        item_count: itemCount,
        items: items,
        warnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating payload:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

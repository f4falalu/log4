import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing alerts...');

    // Check for urgent deliveries not assigned within 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: urgentBatches } = await supabase
      .from('delivery_batches')
      .select('*')
      .eq('priority', 'urgent')
      .eq('status', 'planned')
      .is('driver_id', null)
      .lt('created_at', thirtyMinutesAgo);

    for (const batch of urgentBatches || []) {
      // Get admin users
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'system_admin');

      for (const admin of admins || []) {
        await supabase.from('notifications').insert({
          user_id: admin.user_id,
          type: 'urgent',
          title: 'Urgent Delivery Unassigned',
          message: `${batch.name} has not been assigned a driver for 30+ minutes`,
          related_entity_type: 'batch',
          related_entity_id: batch.id
        });
      }
    }

    // Check for deliveries running behind schedule
    const { data: delayedBatches } = await supabase
      .from('delivery_batches')
      .select('*, route_history(*)')
      .eq('status', 'in-progress');

    for (const batch of delayedBatches || []) {
      // Logic to check if behind schedule would go here
      // For now, placeholder
    }

    console.log('Alerts processed successfully');

    return new Response(
      JSON.stringify({ success: true, processed: urgentBatches?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

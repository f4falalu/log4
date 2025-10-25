import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTelemetryData(
  entityId: string | null, 
  entityType: 'driver' | 'vehicle' | 'batch' | null
) {
  return useQuery({
    queryKey: ['telemetry', entityType, entityId],
    queryFn: async () => {
      if (!entityId || !entityType) return null;
      
      if (entityType === 'driver') {
        // Fetch driver metrics
        const { data: trips } = await supabase
          .from('vehicle_trips')
          .select('*')
          .eq('driver_id', entityId)
          .gte('start_time', new Date(Date.now() - 86400000).toISOString());
        
        const totalDistance = trips?.reduce((sum, t) => {
          const start = t.start_odometer || 0;
          const end = t.end_odometer || 0;
          return sum + (end - start);
        }, 0) || 0;
        
        const { data: batches } = await supabase
          .from('delivery_batches')
          .select('*')
          .eq('driver_id', entityId)
          .eq('status', 'in-progress');
        
        return {
          distance: `${totalDistance} km`,
          idle: '12%', // TODO: Calculate from location history
          eta: '1h 45m', // TODO: Calculate from active route
          deliveries: batches?.length || 0
        };
      }
      
      if (entityType === 'vehicle') {
        // Fetch vehicle metrics
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('*, vehicle_trips(*)')
          .eq('id', entityId)
          .single();
        
        if (!vehicle) return null;
        
        // Find active batch for this vehicle
        const { data: activeBatch } = await supabase
          .from('delivery_batches')
          .select('id')
          .eq('vehicle_id', entityId)
          .in('status', ['planned', 'in-progress'])
          .limit(1)
          .single();
        
        let utilizationPct = 0;
        if (activeBatch) {
          const { data: payload } = await supabase
            .from('payload_items')
            .select('weight_kg, volume_m3')
            .eq('batch_id', activeBatch.id);
          
          const totalWeight = payload?.reduce((sum, p) => sum + Number(p.weight_kg), 0) || 0;
          utilizationPct = vehicle.max_weight ? (totalWeight / vehicle.max_weight * 100) : 0;
        }
        
        return {
          payload: `${utilizationPct.toFixed(0)}%`,
          routeProgress: '60%', // TODO: Calculate from route_history
          stopsCompleted: '3/5', // TODO: Calculate from route_history
          avgSpeed: `${vehicle.avg_speed || 0} km/h`
        };
      }
      
      if (entityType === 'batch') {
        // Fetch batch metrics
        const { data: batch } = await supabase
          .from('delivery_batches')
          .select('*, route_history(*)')
          .eq('id', entityId)
          .single();
        
        if (!batch) return null;
        
        const completedStops = batch.route_history?.filter((r: any) => r.status === 'delivered').length || 0;
        const totalStops = batch.route_history?.length || 0;
        
        return {
          completion: `${totalStops > 0 ? Math.round(completedStops / totalStops * 100) : 0}%`,
          avgStopTime: '8 min', // TODO: Calculate from route_history
          totalDistance: `${batch.total_distance || 0} km`,
          etaProgress: `${batch.estimated_duration || 0} min`
        };
      }
      
      return null;
    },
    enabled: !!entityId && !!entityType,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

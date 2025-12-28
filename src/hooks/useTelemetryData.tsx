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
        
        // Calculate idle percentage from trip data
        const totalTripTime = trips?.reduce((sum, t) => {
          if (!t.start_time || !t.end_time) return sum;
          const duration = new Date(t.end_time).getTime() - new Date(t.start_time).getTime();
          return sum + duration;
        }, 0) || 0;

        const movingTime = trips?.reduce((sum, t) => {
          // Estimate moving time based on distance and average speed
          const distance = (t.end_odometer || 0) - (t.start_odometer || 0);
          const avgSpeed = t.avg_speed || 40; // Default 40 km/h
          const movingTimeMs = distance > 0 ? (distance / avgSpeed) * 3600000 : 0;
          return sum + movingTimeMs;
        }, 0) || 0;

        const idleTime = totalTripTime - movingTime;
        const idlePercentage = totalTripTime > 0 ? (idleTime / totalTripTime * 100) : 0;

        // Calculate ETA from active batch
        let etaText = 'N/A';
        if (batches && batches.length > 0) {
          const activeBatch = batches[0];

          // Get route history to calculate remaining stops
          const { data: routeHistory } = await supabase
            .from('route_history')
            .select('*')
            .eq('batch_id', activeBatch.id)
            .order('sequence_number');

          if (routeHistory && routeHistory.length > 0) {
            const completedStops = routeHistory.filter(r => r.actual_arrival).length;
            const remainingStops = routeHistory.filter(r => !r.actual_arrival);

            if (remainingStops.length > 0) {
              // Estimate ETA based on remaining planned durations
              const remainingDuration = remainingStops.reduce((sum, stop) =>
                sum + (stop.planned_duration || 15), 0
              );

              // Add travel time between stops
              const travelTime = remainingStops.reduce((sum, stop) =>
                sum + ((stop.distance_from_previous || 0) / 40 * 60), 0
              );

              const totalMinutes = Math.round(remainingDuration + travelTime);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;

              etaText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            } else {
              etaText = 'Complete';
            }
          }
        }

        return {
          distance: `${totalDistance} km`,
          idle: `${idlePercentage.toFixed(0)}%`,
          eta: etaText,
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
        
        // Calculate route progress and stops from route_history
        let routeProgressPct = 0;
        let stopsText = '0/0';

        if (activeBatch) {
          const { data: routeHistory } = await supabase
            .from('route_history')
            .select('*')
            .eq('batch_id', activeBatch.id)
            .order('sequence_number');

          if (routeHistory && routeHistory.length > 0) {
            const completed = routeHistory.filter(r => r.actual_arrival).length;
            const total = routeHistory.length;

            routeProgressPct = total > 0 ? (completed / total * 100) : 0;
            stopsText = `${completed}/${total}`;
          }
        }

        return {
          payload: `${utilizationPct.toFixed(0)}%`,
          routeProgress: `${routeProgressPct.toFixed(0)}%`,
          stopsCompleted: stopsText,
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
        
        const completedStops = batch.route_history?.filter((r: any) => r.actual_arrival && r.actual_duration).length || 0;
        const totalStops = batch.route_history?.length || 0;

        // Calculate average stop time from completed stops
        let avgStopTimeText = 'N/A';
        if (completedStops > 0) {
          const totalStopTime = batch.route_history?.reduce((sum: number, r: any) => {
            if (r.actual_duration) {
              return sum + r.actual_duration;
            }
            return sum;
          }, 0) || 0;

          const avgMinutes = Math.round(totalStopTime / completedStops);
          avgStopTimeText = `${avgMinutes} min`;
        }

        return {
          completion: `${totalStops > 0 ? Math.round(completedStops / totalStops * 100) : 0}%`,
          avgStopTime: avgStopTimeText,
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

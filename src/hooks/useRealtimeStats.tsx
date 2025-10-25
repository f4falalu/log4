import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeStats {
  activeVehicles: number;
  inProgressDeliveries: number;
  completedDeliveries: number;
  activeAlerts: number;
}

export function useRealtimeStats() {
  return useQuery({
    queryKey: ['realtime-stats'],
    queryFn: async (): Promise<RealtimeStats> => {
      // Count active vehicles (with current driver or in active batches)
      const { count: activeVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in-use');

      // Count in-progress deliveries
      const { count: inProgressDeliveries } = await supabase
        .from('route_history')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in-progress');

      // Count completed deliveries today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: completedDeliveries } = await supabase
        .from('route_history')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('actual_arrival', today.toISOString());

      // Count active alerts
      const { count: activeAlerts } = await supabase
        .from('zone_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false);

      return {
        activeVehicles: activeVehicles || 0,
        inProgressDeliveries: inProgressDeliveries || 0,
        completedDeliveries: completedDeliveries || 0,
        activeAlerts: activeAlerts || 0,
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

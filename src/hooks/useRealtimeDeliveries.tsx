import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeDeliveries() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('deliveries-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_history',
        },
        (payload) => {
          console.log('[useRealtimeDeliveries] Delivery update:', payload);
          queryClient.invalidateQueries({ queryKey: ['route-history'] });
          queryClient.invalidateQueries({ queryKey: ['realtime-stats'] });

          // Show toast for delivery status changes
          if (payload.eventType === 'UPDATE' && payload.new) {
            const delivery = payload.new as any;
            if (delivery.status === 'delivered') {
              toast.success('Delivery Completed', {
                description: `Stop #${delivery.sequence_number} delivered`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

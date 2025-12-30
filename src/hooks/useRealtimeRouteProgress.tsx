import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeRouteProgress() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('route-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_history'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['route-history'] });
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const stop = payload.new as any;
            if (stop.status === 'completed') {
              toast.success('Stop completed', {
                description: `Delivery stop ${stop.sequence_number} completed`
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

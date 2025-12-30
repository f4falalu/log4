import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeSchedules() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_schedules',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
          
          if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any).status;
            
            if (newStatus !== oldStatus) {
              toast.info(`Schedule status changed to ${newStatus}`);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_batches',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['schedule-batches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

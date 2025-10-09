import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeBatches() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('delivery-batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches'
        },
        (payload) => {
          console.log('Batch update received:', payload);
          
          // Invalidate queries to refetch latest data
          queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
          
          // Show toast for important events
          if (payload.eventType === 'UPDATE' && payload.new) {
            const batch = payload.new as any;
            if (batch.status === 'in-progress') {
              toast.info('Delivery started', {
                description: `${batch.name} is now in progress`
              });
            } else if (batch.status === 'completed') {
              toast.success('Delivery completed', {
                description: `${batch.name} has been completed`
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

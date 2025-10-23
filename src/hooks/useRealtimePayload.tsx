import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real-time subscription for payload item changes
 * Invalidates vehicle payload queries when items are added/updated/removed
 */
export function useRealtimePayload() {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const channel = supabase
      .channel('payload-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payload_items',
        },
        (payload) => {
          console.log('Payload item update received:', payload);

          // Debounce invalidation to prevent rapid re-renders
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            // Invalidate vehicle payload queries
            queryClient.invalidateQueries({ queryKey: ['vehicle-payload'] });
            
            // Invalidate batch queries if batch_id is available
            if (payload.new && 'batch_id' in payload.new) {
              queryClient.invalidateQueries({ 
                queryKey: ['delivery-batches', payload.new.batch_id] 
              });
            }
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

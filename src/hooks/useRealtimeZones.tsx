import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeZones() {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const channel = supabase
      .channel('service-zones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_zones'
        },
        (payload) => {
          
          // Debounce invalidation to prevent rapid re-renders
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['service-zones'] });
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

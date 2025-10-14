import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeZones() {
  const queryClient = useQueryClient();

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
          console.log('Service zone update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['service-zones'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeVehicles() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('vehicles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
        },
        (payload) => {
          console.log('[useRealtimeVehicles] Vehicle update:', payload);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

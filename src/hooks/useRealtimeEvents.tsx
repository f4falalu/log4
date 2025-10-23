import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemEvent {
  id: string;
  type: 'batch' | 'handoff' | 'driver' | 'zone' | 'vehicle';
  event: string;
  timestamp: string;
  data: any;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
}

export function useRealtimeEvents(onEvent?: (event: SystemEvent) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to batch changes
    const batchChannel = supabase
      .channel('system-events-batches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches'
        },
        (payload) => {
          console.log('Batch event:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          const event: SystemEvent = {
            id: `batch-${newData?.id || oldData?.id}-${Date.now()}`,
            type: 'batch',
            event: `Batch ${payload.eventType?.toLowerCase()}`,
            timestamp: new Date().toISOString(),
            data: newData || oldData,
            severity: payload.eventType === 'DELETE' ? 'warning' : 'info',
            acknowledged: false
          };

          if (payload.eventType === 'UPDATE' && payload.new) {
            const batch = payload.new as any;
            if (batch.status === 'in-progress') {
              event.event = 'Batch started';
              event.severity = 'info';
              toast.info('Delivery started', {
                description: `${batch.name} is now in progress`
              });
            } else if (batch.status === 'completed') {
              event.event = 'Batch completed';
              event.severity = 'info';
              toast.success('Delivery completed', {
                description: `${batch.name} has been completed`
              });
            }
          }

          onEvent?.(event);
          queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
        }
      )
      .subscribe();

    // Subscribe to handoff changes
    const handoffChannel = supabase
      .channel('system-events-handoffs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'handoffs'
        },
        (payload) => {
          console.log('Handoff event:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          const event: SystemEvent = {
            id: `handoff-${newData?.id || oldData?.id}-${Date.now()}`,
            type: 'handoff',
            event: `Handoff ${payload.eventType?.toLowerCase()}`,
            timestamp: new Date().toISOString(),
            data: newData || oldData,
            severity: 'info',
            acknowledged: false
          };

          if (payload.eventType === 'INSERT') {
            event.event = 'Handoff initiated';
            toast.info('Handoff initiated', {
              description: 'Vehicle transfer in progress'
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const handoff = payload.new as any;
            if (handoff.status === 'completed') {
              event.event = 'Handoff completed';
              toast.success('Handoff completed', {
                description: 'Batch successfully transferred'
              });
            }
          }

          onEvent?.(event);
          queryClient.invalidateQueries({ queryKey: ['handoffs'] });
        }
      )
      .subscribe();

    // Subscribe to driver location updates
    const driverChannel = supabase
      .channel('system-events-drivers')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver event:', payload);
          
          if (payload.new && payload.old) {
            const newDriver = payload.new as any;
            const oldDriver = payload.old as any;

            // Check for status changes
            if (newDriver.status !== oldDriver.status) {
              const event: SystemEvent = {
                id: `driver-${newDriver.id}-${Date.now()}`,
                type: 'driver',
                event: `Driver ${newDriver.status}`,
                timestamp: new Date().toISOString(),
                data: newDriver,
                severity: newDriver.status === 'offline' ? 'warning' : 'info',
                acknowledged: false
              };

              onEvent?.(event);

              if (newDriver.status === 'offline') {
                toast.warning('Driver offline', {
                  description: `${newDriver.name} is now offline`
                });
              }
            }
          }

          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }
      )
      .subscribe();

    // Subscribe to zone alerts (already exists but adding to unified stream)
    const zoneChannel = supabase
      .channel('system-events-zones')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_alerts'
        },
        (payload) => {
          console.log('Zone alert event:', payload);
          
          if (payload.new) {
            const alert = payload.new as any;
            const event: SystemEvent = {
              id: alert.id,
              type: 'zone',
              event: alert.event_type,
              timestamp: alert.timestamp,
              data: alert,
              severity: alert.event_type === 'zone_exit' ? 'critical' : 'warning',
              acknowledged: alert.acknowledged
            };

            onEvent?.(event);

            if (!alert.acknowledged) {
              toast.warning('Zone Alert', {
                description: `${alert.event_type} detected`
              });
            }
          }

          queryClient.invalidateQueries({ queryKey: ['zone-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchChannel);
      supabase.removeChannel(handoffChannel);
      supabase.removeChannel(driverChannel);
      supabase.removeChannel(zoneChannel);
    };
  }, [queryClient, onEvent]);
}

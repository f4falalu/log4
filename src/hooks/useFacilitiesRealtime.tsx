import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook to subscribe to realtime facilities updates
 * Automatically invalidates queries and shows toast notifications
 */
export function useFacilitiesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to facilities table changes
    const facilitiesChannel = supabase
      .channel('facilities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facilities',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Facilities change received:', payload);

          // Invalidate facilities queries to refetch
          queryClient.invalidateQueries({ queryKey: ['facilities'] });

          // Show toast notifications
          switch (payload.eventType) {
            case 'INSERT':
              toast.success('New facility added', {
                description: payload.new.name || 'A new facility was created',
              });
              break;
            case 'UPDATE':
              toast.info('Facility updated', {
                description: payload.new.name || 'A facility was updated',
              });
              break;
            case 'DELETE':
              toast.warning('Facility deleted', {
                description: 'A facility was removed',
              });
              break;
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(facilitiesChannel);
    };
  }, [queryClient]);
}

/**
 * Hook to subscribe to realtime facility services updates
 */
export function useFacilityServicesRealtime(facilityId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!facilityId) return;

    const servicesChannel = supabase
      .channel(`facility-services-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facility_services',
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Facility services change:', payload);
          queryClient.invalidateQueries({ queryKey: ['facility-services', facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
    };
  }, [facilityId, queryClient]);
}

/**
 * Hook to subscribe to realtime facility deliveries updates
 */
export function useFacilityDeliveriesRealtime(facilityId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!facilityId) return;

    const deliveriesChannel = supabase
      .channel(`facility-deliveries-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facility_deliveries',
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Facility deliveries change:', payload);
          queryClient.invalidateQueries({ queryKey: ['facility-deliveries', facilityId] });

          if (payload.eventType === 'INSERT') {
            toast.info('New delivery record', {
              description: `Delivery added for facility`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliveriesChannel);
    };
  }, [facilityId, queryClient]);
}

/**
 * Hook to subscribe to realtime facility stock updates
 */
export function useFacilityStockRealtime(facilityId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!facilityId) return;

    const stockChannel = supabase
      .channel(`facility-stock-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facility_stock',
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Facility stock change:', payload);
          queryClient.invalidateQueries({ queryKey: ['facility-stock', facilityId] });

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            toast.info('Stock updated', {
              description: `${payload.new.product_name}: ${payload.new.quantity} ${payload.new.unit || ''}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [facilityId, queryClient]);
}

/**
 * Hook to subscribe to realtime audit log updates
 */
export function useFacilityAuditLogRealtime(facilityId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!facilityId) return;

    const auditChannel = supabase
      .channel(`facility-audit-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'facility_audit_log',
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Facility audit log change:', payload);
          queryClient.invalidateQueries({ queryKey: ['facility-audit-log', facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
    };
  }, [facilityId, queryClient]);
}

/**
 * Comprehensive hook that subscribes to all facility-related realtime updates
 */
export function useAllFacilityRealtime(facilityId?: string) {
  useFacilitiesRealtime();
  useFacilityServicesRealtime(facilityId);
  useFacilityDeliveriesRealtime(facilityId);
  useFacilityStockRealtime(facilityId);
  useFacilityAuditLogRealtime(facilityId);
}

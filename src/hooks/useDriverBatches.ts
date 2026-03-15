import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriverBatch {
  id: string;
  name: string;
  status: 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  priority: string;
  scheduledDate: string;
  scheduledTime: string;
  warehouseName: string;
  facilityCount: number;
  totalDistance: number;
  estimatedDuration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  vehicleId?: string;
  totalWeight?: number;
  totalVolume?: number;
}

export function useDriverBatches(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-batches', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_batches')
        .select(`
          id, name, status, priority,
          scheduled_date, scheduled_time,
          total_distance, estimated_duration,
          actual_start_time, actual_end_time,
          vehicle_id, facility_ids,
          total_weight, total_volume,
          warehouse:warehouses(name)
        `)
        .eq('driver_id', driverId!)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((b): DriverBatch => ({
        id: b.id,
        name: b.name,
        status: b.status as DriverBatch['status'],
        priority: b.priority,
        scheduledDate: b.scheduled_date,
        scheduledTime: b.scheduled_time,
        warehouseName: (b.warehouse as any)?.name || '',
        facilityCount: b.facility_ids?.length || 0,
        totalDistance: Number(b.total_distance) || 0,
        estimatedDuration: b.estimated_duration || 0,
        actualStartTime: b.actual_start_time || undefined,
        actualEndTime: b.actual_end_time || undefined,
        vehicleId: b.vehicle_id || undefined,
        totalWeight: b.total_weight ? Number(b.total_weight) : undefined,
        totalVolume: b.total_volume ? Number(b.total_volume) : undefined,
      }));
    },
    enabled: !!driverId,
  });
}

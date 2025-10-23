import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeliverySchedule {
  id: string;
  title: string;
  warehouse_id: string;
  planned_date: string;
  time_window: 'morning' | 'afternoon' | 'evening' | 'all_day';
  route?: any;
  vehicle_id?: string;
  driver_id?: string;
  status: 'draft' | 'confirmed' | 'exported' | 'dispatched' | 'cancelled';
  total_payload_kg: number;
  total_volume_m3: number;
  facility_ids: string[];
  optimization_method?: 'manual' | 'ai_optimized';
  created_by?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  dispatched_at?: string;
  notes?: string;
  warehouse?: { name: string; address: string };
  vehicle?: { model: string; plate_number: string; capacity: number };
  driver?: { name: string; phone: string };
}

interface ScheduleFilters {
  warehouseId?: string;
  dateRange?: { start: Date; end: Date };
  status?: string;
  vehicleId?: string;
  driverId?: string;
}

export function useDeliverySchedules(filters?: ScheduleFilters) {
  return useQuery({
    queryKey: ['delivery-schedules', filters],
    queryFn: async () => {
      let query = supabase
        .from('delivery_schedules')
        .select(`
          *,
          warehouse:warehouses(name, address),
          vehicle:vehicles(model, plate_number, capacity),
          driver:drivers(name, phone)
        `);

      if (filters?.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId);
      }

      if (filters?.dateRange) {
        query = query
          .gte('planned_date', filters.dateRange.start.toISOString().split('T')[0])
          .lte('planned_date', filters.dateRange.end.toISOString().split('T')[0]);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId);
      }

      if (filters?.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      const { data, error } = await query.order('planned_date', { ascending: true });

      if (error) throw error;
      return data as DeliverySchedule[];
    }
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Omit<DeliverySchedule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('delivery_schedules')
        .insert({
          ...schedule,
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
      toast.success('Schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create schedule', {
        description: error.message
      });
    }
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DeliverySchedule> }) => {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
      toast.success('Schedule updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update schedule', {
        description: error.message
      });
    }
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-schedules'] });
      toast.success('Schedule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete schedule', {
        description: error.message
      });
    }
  });
}

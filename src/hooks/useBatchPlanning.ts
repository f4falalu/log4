import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchStop {
  id: string;
  batch_id: string;
  facility_id: string;
  stop_sequence: number;
  stop_type: 'pickup' | 'delivery' | 'waypoint';
  estimated_arrival?: string;
  actual_arrival?: string;
  estimated_departure?: string;
  actual_departure?: string;
  status: 'pending' | 'en_route' | 'arrived' | 'completed' | 'skipped';
  delivery_confirmation?: any;
  notes?: string;
  facility?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface EnhancedBatch {
  id: string;
  batch_number: string;
  name: string;
  vehicle_id?: string;
  driver_id?: string;
  warehouse_id?: string;
  origin_facility_id?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  batch_type: 'delivery' | 'pickup' | 'mixed';
  requisition_ids: string[];
  total_weight: number;
  total_volume: number;
  route_optimization_method: 'client' | 'api' | 'manual';
  route_constraints: any;
  route_sequence: any[];
  expected_start_time?: string;
  expected_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  delivery_instructions?: string;
  special_requirements: string[];
  weather_conditions?: string;
  traffic_conditions?: string;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    model: string;
    plate_number: string;
    capacity_volume_m3: number;
    capacity_weight_kg: number;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  stops?: BatchStop[];
  requisitions?: any[];
}

export interface CreateBatchData {
  name?: string;
  vehicle_id: string;
  driver_id?: string;
  warehouse_id?: string;
  origin_facility_id?: string;
  batch_type: 'delivery' | 'pickup' | 'mixed';
  requisition_ids: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  route_optimization_method: 'client' | 'api' | 'manual';
  expected_start_time?: string;
  expected_end_time?: string;
  delivery_instructions?: string;
  special_requirements?: string[];
  status?: string; // Add status field for updates
  stops: {
    facility_id: string;
    stop_sequence: number;
    stop_type: 'pickup' | 'delivery' | 'waypoint';
    estimated_arrival?: string;
    estimated_departure?: string;
  }[];
}

// Get all batches with enhanced data
export function useEnhancedBatches(filters?: {
  status?: string;
  vehicle_id?: string;
  driver_id?: string;
  batch_type?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['enhanced-batches', filters],
    retry: 2, // Limit retries to prevent infinite loading
    retryDelay: 1000, // 1 second delay between retries
    queryFn: async () => {
      let query = (supabase as any)
        .from('delivery_batches')
        .select(`
          *,
          vehicle:vehicles(id, model, plate_number, capacity_volume_m3, capacity_weight_kg),
          driver:drivers(id, name, phone),
          warehouse:warehouses(id, name),
          origin_facility:facilities!delivery_batches_origin_facility_id_fkey(id, name, address, lat, lng)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.vehicle_id && filters.vehicle_id !== 'all') {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters?.driver_id && filters.driver_id !== 'all') {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.batch_type && filters.batch_type !== 'all') {
        query = query.eq('batch_type', filters.batch_type);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match interface
      return data.map((batch: any) => ({
        ...batch,
        requisition_ids: batch.requisition_ids || [],
        route_sequence: batch.route_sequence || [],
        special_requirements: batch.special_requirements || [],
        route_constraints: batch.route_constraints || {}
      })) as EnhancedBatch[];
    },
    refetchInterval: 30000,
  });
}

// Get single batch with full details
export function useEnhancedBatch(id: string) {
  return useQuery({
    queryKey: ['enhanced-batch', id],
    queryFn: async () => {
      const { data: batch, error: batchError } = await (supabase as any)
        .from('delivery_batches')
        .select(`
          *,
          vehicle:vehicles(id, model, plate_number, capacity_volume_m3, capacity_weight_kg),
          driver:drivers(id, name, phone),
          warehouse:warehouses(id, name),
          origin_facility:facilities!delivery_batches_origin_facility_id_fkey(id, name, address, lat, lng)
        `)
        .eq('id', id)
        .single();

      if (batchError) throw batchError;

      // Get batch stops
      const { data: stops, error: stopsError } = await (supabase as any)
        .from('batch_stops')
        .select(`
          *,
          facility:facilities(id, name, address, lat, lng)
        `)
        .eq('batch_id', id)
        .order('stop_sequence', { ascending: true });

      if (stopsError) throw stopsError;

      // Get linked requisitions
      const { data: requisitions, error: reqError } = await (supabase as any)
        .from('batch_requisitions')
        .select(`
          requisition:requisitions(
            id,
            requisition_number,
            facility_id,
            total_items,
            total_weight,
            total_volume,
            facility:facilities(name, address)
          )
        `)
        .eq('batch_id', id);

      if (reqError) throw reqError;

      return {
        ...batch,
        requisition_ids: batch.requisition_ids || [],
        route_sequence: batch.route_sequence || [],
        special_requirements: batch.special_requirements || [],
        route_constraints: batch.route_constraints || {},
        stops: stops || [],
        requisitions: requisitions?.map((r: any) => r.requisition) || []
      } as EnhancedBatch;
    },
    enabled: !!id,
  });
}

// Create new batch with route optimization
export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBatchData) => {
      // Calculate totals from requisitions
      let totalWeight = 0;
      let totalVolume = 0;

      if (data.requisition_ids.length > 0) {
        const { data: requisitions, error: reqError } = await (supabase as any)
          .from('requisitions')
          .select('total_weight, total_volume')
          .in('id', data.requisition_ids);

        if (reqError) throw reqError;

        totalWeight = requisitions.reduce((sum: number, req: any) => sum + req.total_weight, 0);
        totalVolume = requisitions.reduce((sum: number, req: any) => sum + req.total_volume, 0);
      }

      // Create the batch
      const { data: batch, error: batchError } = await (supabase as any)
        .from('delivery_batches')
        .insert({
          name: data.name || `Batch ${new Date().toISOString().split('T')[0]}`,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          warehouse_id: data.warehouse_id,
          origin_facility_id: data.origin_facility_id,
          batch_type: data.batch_type,
          requisition_ids: data.requisition_ids,
          priority: data.priority,
          route_optimization_method: data.route_optimization_method,
          expected_start_time: data.expected_start_time,
          expected_end_time: data.expected_end_time,
          delivery_instructions: data.delivery_instructions,
          special_requirements: data.special_requirements || [],
          total_weight: totalWeight,
          total_volume: totalVolume,
          status: 'planned',
          // Required legacy fields
          scheduled_date: data.expected_start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
          scheduled_time: data.expected_start_time?.split('T')[1]?.split('.')[0] || '09:00:00',
          total_distance: 0,
          estimated_duration: 0,
          medication_type: 'general',
          total_quantity: 1
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create batch stops
      if (data.stops.length > 0) {
        const stopsWithBatchId = data.stops.map(stop => ({
          ...stop,
          batch_id: batch.id
        }));

        const { error: stopsError } = await (supabase as any)
          .from('batch_stops')
          .insert(stopsWithBatchId);

        if (stopsError) throw stopsError;
      }

      // Link requisitions to batch
      if (data.requisition_ids.length > 0) {
        const batchRequisitions = data.requisition_ids.map(reqId => ({
          batch_id: batch.id,
          requisition_id: reqId
        }));

        const { error: linkError } = await (supabase as any)
          .from('batch_requisitions')
          .insert(batchRequisitions);

        if (linkError) throw linkError;
      }

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-batches'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Batch created successfully');
    },
    onError: (error: any) => {
      console.error('Create batch error:', error);
      toast.error(`Failed to create batch: ${error.message}`);
    }
  });
}

// Update batch
export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateBatchData> }) => {
      const { data: batch, error } = await (supabase as any)
        .from('delivery_batches')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return batch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-batches'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-batch', variables.id] });
      toast.success('Batch updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update batch: ${error.message}`);
    }
  });
}

// Delete batch
export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('delivery_batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-batches'] });
      toast.success('Batch deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete batch: ${error.message}`);
    }
  });
}

// Update batch stop status
export function useUpdateBatchStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      actual_arrival, 
      actual_departure, 
      delivery_confirmation,
      notes 
    }: {
      id: string;
      status?: string;
      actual_arrival?: string;
      actual_departure?: string;
      delivery_confirmation?: any;
      notes?: string;
    }) => {
      const updateData: any = {};
      
      if (status) updateData.status = status;
      if (actual_arrival) updateData.actual_arrival = actual_arrival;
      if (actual_departure) updateData.actual_departure = actual_departure;
      if (delivery_confirmation) updateData.delivery_confirmation = delivery_confirmation;
      if (notes) updateData.notes = notes;

      const { data, error } = await (supabase as any)
        .from('batch_stops')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-batches'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-batch', data.batch_id] });
      toast.success('Stop status updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update stop: ${error.message}`);
    }
  });
}

// Get batch analytics
export function useBatchAnalytics() {
  return useQuery({
    queryKey: ['batch-analytics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_batches')
        .select(`
          status,
          batch_type,
          priority,
          total_weight,
          total_volume,
          created_at,
          vehicle:vehicles(model),
          driver:drivers(name)
        `);

      if (error) throw error;

      // Calculate analytics
      const analytics = {
        totalBatches: data.length,
        statusBreakdown: data.reduce((acc: any, batch: any) => {
          acc[batch.status] = (acc[batch.status] || 0) + 1;
          return acc;
        }, {}),
        typeBreakdown: data.reduce((acc: any, batch: any) => {
          acc[batch.batch_type] = (acc[batch.batch_type] || 0) + 1;
          return acc;
        }, {}),
        priorityBreakdown: data.reduce((acc: any, batch: any) => {
          acc[batch.priority] = (acc[batch.priority] || 0) + 1;
          return acc;
        }, {}),
        totalWeight: data.reduce((sum: number, batch: any) => sum + (batch.total_weight || 0), 0),
        totalVolume: data.reduce((sum: number, batch: any) => sum + (batch.total_volume || 0), 0),
        avgWeight: data.length > 0 ? data.reduce((sum: number, batch: any) => sum + (batch.total_weight || 0), 0) / data.length : 0,
        avgVolume: data.length > 0 ? data.reduce((sum: number, batch: any) => sum + (batch.total_volume || 0), 0) / data.length : 0
      };

      return analytics;
    },
    refetchInterval: 300000, // 5 minutes
  });
}

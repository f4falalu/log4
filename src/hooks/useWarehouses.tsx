import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Warehouse, WarehouseFilters, WarehouseFormData, WarehouseStats } from '@/types/warehouse';
import { toast } from 'sonner';

// ========================================
// Core CRUD Hooks
// ========================================

/**
 * Fetches all warehouses with optional filters and pagination
 */
export function useWarehouses(filters?: WarehouseFilters, page?: number, pageSize: number = 50) {
  return useQuery({
    queryKey: ['warehouses', filters, page],
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 300000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      let query = supabase
        .from('warehouses')
        .select('*', { count: 'exact' })
        .order('name');

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
      }
      if (filters?.state) {
        query = query.eq('state', filters.state);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      // Apply pagination
      if (page !== undefined) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        warehouses: (data || []) as Warehouse[],
        total: count || 0,
      };
    },
  });
}

/**
 * Fetches a single warehouse by ID
 */
export function useWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      if (!id) throw new Error('Warehouse ID is required');

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Warehouse;
    },
    enabled: !!id,
  });
}

/**
 * Fetches warehouse statistics
 */
export function useWarehousesStats() {
  return useQuery({
    queryKey: ['warehouses-stats'],
    staleTime: 60000, // Data is fresh for 1 minute
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('total_capacity_m3, used_capacity_m3, is_active');

      if (error) throw error;

      const warehouses = data || [];
      const total = warehouses.length;
      const active = warehouses.filter(w => w.is_active).length;
      const totalCapacity = warehouses.reduce((sum, w) => sum + (w.total_capacity_m3 || 0), 0);
      const usedCapacity = warehouses.reduce((sum, w) => sum + (w.used_capacity_m3 || 0), 0);
      const utilization = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

      return {
        total_warehouses: total,
        active_warehouses: active,
        total_capacity_m3: totalCapacity,
        used_capacity_m3: usedCapacity,
        utilization_pct: utilization,
      } as WarehouseStats;
    },
  });
}

/**
 * Creates a new warehouse
 */
export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouse: WarehouseFormData) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address || null,
          city: warehouse.city || null,
          state: warehouse.state || null,
          country: warehouse.country || 'Nigeria',
          lat: warehouse.lat || null,
          lng: warehouse.lng || null,
          contact_name: warehouse.contact_name || null,
          contact_phone: warehouse.contact_phone || null,
          contact_email: warehouse.contact_email || null,
          operating_hours: warehouse.operating_hours || null,
          total_capacity_m3: warehouse.total_capacity_m3 || null,
          used_capacity_m3: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Warehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-stats'] });
      toast.success('Warehouse created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create warehouse: ${error.message}`);
    },
  });
}

/**
 * Updates an existing warehouse
 */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WarehouseFormData> }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update({
          name: updates.name,
          code: updates.code,
          address: updates.address || null,
          city: updates.city || null,
          state: updates.state || null,
          country: updates.country || null,
          lat: updates.lat || null,
          lng: updates.lng || null,
          contact_name: updates.contact_name || null,
          contact_phone: updates.contact_phone || null,
          contact_email: updates.contact_email || null,
          operating_hours: updates.operating_hours || null,
          total_capacity_m3: updates.total_capacity_m3 || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Warehouse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-stats'] });
      toast.success('Warehouse updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update warehouse: ${error.message}`);
    },
  });
}

/**
 * Deletes a warehouse (soft delete by setting is_active to false)
 */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-stats'] });
      toast.success('Warehouse deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete warehouse: ${error.message}`);
    },
  });
}

/**
 * Toggles warehouse active status
 */
export function useToggleWarehouseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses-stats'] });
      toast.success('Warehouse status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update warehouse status: ${error.message}`);
    },
  });
}

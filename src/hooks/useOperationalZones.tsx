import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  OperationalZone,
  CreateZoneInput,
  UpdateZoneInput,
  ZoneSummary
} from '@/types/zones';
import { toast } from 'sonner';

export function useOperationalZones(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['operational-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones' as any)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as OperationalZone[];
    },
    enabled: options?.enabled ?? true,
  });

  // Expose `zones` and `loading` aliases for backward-compatible destructuring
  return Object.assign(query, {
    zones: query.data ?? [] as OperationalZone[],
    loading: query.isLoading,
  });
}

export function useOperationalZone(zoneId: string | null) {
  return useQuery({
    queryKey: ['operational-zone', zoneId],
    queryFn: async () => {
      if (!zoneId) return null;
      
      const { data, error } = await supabase
        .from('zones' as any)
        .select('*')
        .eq('id', zoneId)
        .single();

      if (error) throw error;
      return data as unknown as OperationalZone;
    },
    enabled: !!zoneId,
  });
}

export function useZoneMetrics() {
  return useQuery({
    queryKey: ['zone-metrics'],
    queryFn: async () => {
      const { data: zones, error: zonesError } = await supabase
        .from('zones' as any)
        .select('*');

      if (zonesError) throw zonesError;

      const { count: totalFacilities } = await supabase
        .from('facilities')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      let totalLGAs = 0;
      try {
        const { count } = await supabase
          .from('lgas' as any)
          .select('*', { count: 'exact', head: true });
        totalLGAs = count || 0;
      } catch {
        // lgas table may not exist
      }

      return {
        totalZones: zones?.length || 0,
        activeZones: zones?.filter((z: any) => z.is_active).length || 0,
        totalFacilities: totalFacilities || 0,
        totalLGAs,
      };
    },
  });
}

export function useZoneSummary(zoneId: string | null) {
  return useQuery({
    queryKey: ['zone-summary', zoneId],
    queryFn: async () => {
      if (!zoneId) return null;
      
      const { data, error } = await supabase.rpc('get_zone_summary' as any, {
        zone_uuid: zoneId,
      });

      if (error) throw error;
      return data?.[0] as ZoneSummary | null;
    },
    enabled: !!zoneId,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateZoneInput) => {
      const { data, error } = await supabase
        .from('zones' as any)
        .insert([{
          name: input.name,
          code: input.code,
          description: input.description,
          region_center: input.region_center,
          zone_manager_id: input.zone_manager_id,
          is_active: input.is_active ?? true,
          metadata: input.metadata ?? {},
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OperationalZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('Zone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create zone: ${error.message}`);
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateZoneInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('zones' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OperationalZone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
      queryClient.invalidateQueries({ queryKey: ['operational-zone', data.id] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['zone-summary', data.id] });
      toast.success('Zone updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update zone: ${error.message}`);
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zoneId: string) => {
      const { error } = await supabase
        .from('zones' as any)
        .delete()
        .eq('id', zoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('Zone deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete zone: ${error.message}`);
    },
  });
}

export function useReassignWarehouseToZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warehouseId, zoneId }: { warehouseId: string; zoneId: string }) => {
      const { data, error } = await supabase.rpc('reassign_warehouse_to_zone' as any, {
        warehouse_uuid: warehouseId,
        new_zone_uuid: zoneId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('Warehouse reassigned to zone successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reassign warehouse: ${error.message}`);
    },
  });
}

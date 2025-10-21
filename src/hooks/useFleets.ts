import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Fleet {
  id: string;
  name: string;
  parent_fleet_id?: string;
  vendor_id?: string;
  service_area_id?: string;
  zone_id?: string;
  status: 'active' | 'inactive';
  mission?: string;
  created_at: string;
  vendor?: {
    id: string;
    name: string;
  };
  parent_fleet?: {
    id: string;
    name: string;
  };
  vehicle_count?: number;
}

export interface CreateFleetData {
  name: string;
  parent_fleet_id?: string;
  vendor_id?: string;
  service_area_id?: string;
  zone_id?: string;
  status?: 'active' | 'inactive';
  mission?: string;
}

export function useFleets() {
  return useQuery({
    queryKey: ['fleets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fleets')
        .select(`
          *,
          vendor:vendors(id, name),
          parent_fleet:fleets!parent_fleet_id(id, name),
          vehicles(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fleets:', error);
        throw error;
      }

      // Transform the data to include vehicle count
      return data?.map(fleet => ({
        ...fleet,
        vehicle_count: Array.isArray(fleet.vehicles) ? fleet.vehicles.length : 0
      })) as Fleet[];
    },
  });
}

export function useCreateFleet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFleetData) => {
      const { data: fleet, error } = await (supabase as any)
        .from('fleets')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return fleet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating fleet:', error);
      toast.error('Failed to create fleet');
    },
  });
}

export function useUpdateFleet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateFleetData> }) => {
      const { data: fleet, error } = await (supabase as any)
        .from('fleets')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return fleet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating fleet:', error);
      toast.error('Failed to update fleet');
    },
  });
}

export function useDeleteFleet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('fleets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting fleet:', error);
      toast.error('Failed to delete fleet');
    },
  });
}

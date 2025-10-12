import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleType {
  id: string;
  name: string;
  display_name: string;
  icon_name?: string;
  is_default: boolean;
  created_at: string;
  created_by?: string;
}

export interface VehicleTypeFormData {
  name: string;
  display_name: string;
  icon_name?: string;
}

export function useVehicleTypes() {
  const queryClient = useQueryClient();

  const { data: vehicleTypes, isLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .order('is_default', { ascending: false })
        .order('display_name');

      if (error) throw error;
      return data as VehicleType[];
    }
  });

  const addType = useMutation({
    mutationFn: async (data: VehicleTypeFormData) => {
      const { error } = await supabase
        .from('vehicle_types')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle type added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add vehicle type', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const updateType = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleTypeFormData> }) => {
      const { error } = await supabase
        .from('vehicle_types')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle type updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle type', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicle_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle type deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle type', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return {
    vehicleTypes,
    isLoading,
    addType: addType.mutate,
    updateType: updateType.mutate,
    deleteType: deleteType.mutate,
    isAdding: addType.isPending,
    isUpdating: updateType.isPending,
    isDeleting: deleteType.isPending,
  };
}

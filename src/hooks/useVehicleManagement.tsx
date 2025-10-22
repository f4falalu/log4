import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleFormData {
  type: string; // Now supports custom types
  model: string;
  plate_number: string;
  capacity: number;
  max_weight: number;
  fuel_type: 'diesel' | 'petrol' | 'electric';
  fuel_efficiency: number;
  avg_speed: number;
  photo_url?: string;
  thumbnail_url?: string;
  ai_generated?: boolean;
  fleet_id?: string;
  capacity_volume_m3?: number;
  capacity_weight_kg?: number;
}

export function useVehicleManagement() {
  const queryClient = useQueryClient();

  const createVehicle = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const { error } = await supabase
        .from('vehicles')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const updateVehicle = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormData> }) => {
      const { error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return {
    createVehicle: createVehicle.mutate,
    updateVehicle: updateVehicle.mutate,
    deleteVehicle: deleteVehicle.mutate,
    isCreating: createVehicle.isPending,
    isUpdating: updateVehicle.isPending,
    isDeleting: deleteVehicle.isPending,
  };
}

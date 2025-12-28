/**
 * VLMS Vehicle Management Hooks
 * React Query hooks for vehicle operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { Vehicle, VehicleFormData, VehicleFilters } from '@/types/vlms';
import { toast } from 'sonner';

// =====================================================
// Query Keys
// =====================================================

export const vehicleKeys = {
  all: ['vlms', 'vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters) => [...vehicleKeys.lists(), filters] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  available: () => [...vehicleKeys.all, 'available'] as const,
};

// =====================================================
// Queries
// =====================================================

/**
 * Fetch all vehicles with optional filters
 */
export function useVehicles(filters?: VehicleFilters) {
  const fetchVehicles = useVehiclesStore((state) => state.fetchVehicles);
  const setFilters = useVehiclesStore((state) => state.setFilters);

  return useQuery({
    queryKey: vehicleKeys.list(filters || {}),
    queryFn: async () => {
      if (filters) {
        setFilters(filters);
      }
      await fetchVehicles();
      // Get fresh data from store after fetch completes
      return useVehiclesStore.getState().vehicles;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single vehicle by ID
 */
export function useVehicle(id: string) {
  const fetchVehicleById = useVehiclesStore((state) => state.fetchVehicleById);

  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: async () => {
      await fetchVehicleById(id);
      // Get fresh data from store after fetch completes
      return useVehiclesStore.getState().selectedVehicle;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch available vehicles (for assignments)
 */
export function useAvailableVehicles() {
  return useVehicles({ status: 'available' });
}

// =====================================================
// Mutations
// =====================================================

/**
 * Create new vehicle
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const createVehicle = useVehiclesStore((state) => state.createVehicle);

  return useMutation({
    mutationFn: (data: VehicleFormData) => createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Vehicle created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });
}

/**
 * Update existing vehicle
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const updateVehicle = useVehiclesStore((state) => state.updateVehicle);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleFormData> }) =>
      updateVehicle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      toast.success('Vehicle updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });
}

/**
 * Delete vehicle
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const deleteVehicle = useVehiclesStore((state) => state.deleteVehicle);

  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
  });
}

/**
 * Upload vehicle document
 */
export function useUploadVehicleDocument() {
  const queryClient = useQueryClient();
  const uploadDocument = useVehiclesStore((state) => state.uploadDocument);

  return useMutation({
    mutationFn: ({ vehicleId, file, type }: { vehicleId: string; file: File; type: string }) =>
      uploadDocument(vehicleId, file, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.vehicleId) });
      toast.success('Document uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

/**
 * Upload vehicle photo
 */
export function useUploadVehiclePhoto() {
  const queryClient = useQueryClient();
  const uploadPhoto = useVehiclesStore((state) => state.uploadPhoto);

  return useMutation({
    mutationFn: ({
      vehicleId,
      file,
      caption,
    }: {
      vehicleId: string;
      file: File;
      caption?: string;
    }) => uploadPhoto(vehicleId, file, caption),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.vehicleId) });
      toast.success('Photo uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to upload photo: ${error.message}`);
    },
  });
}

/**
 * Remove vehicle document
 */
export function useRemoveVehicleDocument() {
  const queryClient = useQueryClient();
  const removeDocument = useVehiclesStore((state) => state.removeDocument);

  return useMutation({
    mutationFn: ({ vehicleId, documentUrl }: { vehicleId: string; documentUrl: string }) =>
      removeDocument(vehicleId, documentUrl),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.vehicleId) });
      toast.success('Document removed successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove document: ${error.message}`);
    },
  });
}

/**
 * Remove vehicle photo
 */
export function useRemoveVehiclePhoto() {
  const queryClient = useQueryClient();
  const removePhoto = useVehiclesStore((state) => state.removePhoto);

  return useMutation({
    mutationFn: ({ vehicleId, photoUrl }: { vehicleId: string; photoUrl: string }) =>
      removePhoto(vehicleId, photoUrl),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.vehicleId) });
      toast.success('Photo removed successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove photo: ${error.message}`);
    },
  });
}

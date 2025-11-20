/**
 * VLMS Maintenance Hooks
 * React Query hooks for maintenance operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMaintenanceStore } from '@/stores/vlms/maintenanceStore';
import { MaintenanceFormData, MaintenanceFilters } from '@/types/vlms';
import { toast } from 'sonner';

// Query Keys
export const maintenanceKeys = {
  all: ['vlms', 'maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (filters: MaintenanceFilters) => [...maintenanceKeys.lists(), filters] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
  vehicle: (vehicleId: string) => [...maintenanceKeys.all, 'vehicle', vehicleId] as const,
};

// Queries
export function useMaintenanceRecords(filters?: MaintenanceFilters) {
  const fetchRecords = useMaintenanceStore((state) => state.fetchRecords);
  const records = useMaintenanceStore((state) => state.records);
  const setFilters = useMaintenanceStore((state) => state.setFilters);

  return useQuery({
    queryKey: maintenanceKeys.list(filters || {}),
    queryFn: async () => {
      if (filters) {
        setFilters(filters);
      }
      await fetchRecords();
      return records;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMaintenanceRecord(id: string) {
  const fetchRecordById = useMaintenanceStore((state) => state.fetchRecordById);
  const selectedRecord = useMaintenanceStore((state) => state.selectedRecord);

  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: async () => {
      await fetchRecordById(id);
      return selectedRecord;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useVehicleMaintenance(vehicleId: string) {
  const fetchRecords = useMaintenanceStore((state) => state.fetchRecords);
  const records = useMaintenanceStore((state) => state.records);

  return useQuery({
    queryKey: maintenanceKeys.vehicle(vehicleId),
    queryFn: async () => {
      await fetchRecords(vehicleId);
      return records;
    },
    enabled: !!vehicleId,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutations
export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient();
  const createRecord = useMaintenanceStore((state) => state.createRecord);

  return useMutation({
    mutationFn: (data: MaintenanceFormData) => createRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      toast.success('Maintenance record created');
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
}

export function useUpdateMaintenanceRecord() {
  const queryClient = useQueryClient();
  const updateRecord = useMaintenanceStore((state) => state.updateRecord);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceFormData> }) =>
      updateRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) });
      toast.success('Record updated');
    },
  });
}

export function useDeleteMaintenanceRecord() {
  const queryClient = useQueryClient();
  const deleteRecord = useMaintenanceStore((state) => state.deleteRecord);

  return useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      toast.success('Record deleted');
    },
  });
}

export function useCompleteService() {
  const queryClient = useQueryClient();
  const completeService = useMaintenanceStore((state) => state.completeService);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaintenanceFormData> }) =>
      completeService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      toast.success('Service completed');
    },
  });
}

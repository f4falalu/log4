/**
 * VLMS Maintenance Zustand Store
 * Manages maintenance records state and operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import {
  MaintenanceRecord,
  MaintenanceRecordWithRelations,
  MaintenanceFilters,
  MaintenanceFormData,
} from '@/types/vlms';
import { toast } from 'sonner';

interface MaintenanceState {
  // State
  records: MaintenanceRecordWithRelations[];
  selectedRecord: MaintenanceRecordWithRelations | null;
  filters: MaintenanceFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRecords: (records: MaintenanceRecordWithRelations[]) => void;
  setSelectedRecord: (record: MaintenanceRecordWithRelations | null) => void;
  setFilters: (filters: Partial<MaintenanceFilters>) => void;
  clearFilters: () => void;

  // Async Actions
  fetchRecords: (vehicleId?: string) => Promise<void>;
  fetchRecordById: (id: string) => Promise<void>;
  createRecord: (data: MaintenanceFormData) => Promise<MaintenanceRecord>;
  updateRecord: (id: string, data: Partial<MaintenanceFormData>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  completeService: (id: string, data: Partial<MaintenanceFormData>) => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  devtools(
    (set, get) => ({
      // Initial State
      records: [],
      selectedRecord: null,
      filters: {},
      isLoading: false,
      error: null,

      // Setters
      setRecords: (records) => set({ records }),

      setSelectedRecord: (record) => set({ selectedRecord: record }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      clearFilters: () => set({ filters: {} }),

      // Fetch Records
      fetchRecords: async (vehicleId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();

          // Build query
          let query = supabase
            .from('vlms_maintenance_records')
            .select(
              `
              *,
              vehicle:vehicles!vlms_maintenance_records_vehicle_id_fkey(
                id, vehicle_id, make, model, license_plate, current_mileage
              ),
              created_by_user:profiles!vlms_maintenance_records_created_by_fkey(id, full_name),
              completed_by_user:profiles!vlms_maintenance_records_completed_by_fkey(id, full_name)
            `
            )
            .order('scheduled_date', { ascending: false });

          // Apply vehicle filter if provided
          if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
          }

          // Apply filters
          if (filters.vehicle_id) {
            query = query.eq('vehicle_id', filters.vehicle_id);
          }

          if (filters.status) {
            query = query.eq('status', filters.status);
          }

          if (filters.maintenance_type) {
            query = query.eq('maintenance_type', filters.maintenance_type);
          }

          if (filters.priority) {
            query = query.eq('priority', filters.priority);
          }

          if (filters.scheduled_date_from) {
            query = query.gte('scheduled_date', filters.scheduled_date_from);
          }

          if (filters.scheduled_date_to) {
            query = query.lte('scheduled_date', filters.scheduled_date_to);
          }

          if (filters.service_provider) {
            query = query.ilike('service_provider', `%${filters.service_provider}%`);
          }

          const { data, error } = await query;

          if (error) throw error;

          set({ records: data as MaintenanceRecordWithRelations[], isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to fetch maintenance records: ${error.message}`);
        }
      },

      // Fetch Single Record
      fetchRecordById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('vlms_maintenance_records')
            .select(
              `
              *,
              vehicle:vehicles!vlms_maintenance_records_vehicle_id_fkey(
                id, vehicle_id, make, model, license_plate, current_mileage
              ),
              created_by_user:profiles!vlms_maintenance_records_created_by_fkey(id, full_name),
              completed_by_user:profiles!vlms_maintenance_records_completed_by_fkey(id, full_name)
            `
            )
            .eq('id', id)
            .single();

          if (error) throw error;

          set({ selectedRecord: data as MaintenanceRecordWithRelations, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to fetch maintenance record: ${error.message}`);
        }
      },

      // Create Record
      createRecord: async (data: MaintenanceFormData) => {
        set({ isLoading: true, error: null });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { data: record, error } = await supabase
            .from('vlms_maintenance_records')
            .insert({
              ...data,
              created_by: user.user.id,
            })
            .select()
            .single();

          if (error) throw error;

          // Refresh records list
          await get().fetchRecords();

          set({ isLoading: false });
          toast.success('Maintenance record created successfully');

          return record;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to create maintenance record: ${error.message}`);
          throw error;
        }
      },

      // Update Record
      updateRecord: async (id: string, data: Partial<MaintenanceFormData>) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('vlms_maintenance_records')
            .update(data)
            .eq('id', id);

          if (error) throw error;

          // Refresh records list
          await get().fetchRecords();

          // Refresh selected record if it's the one being updated
          if (get().selectedRecord?.id === id) {
            await get().fetchRecordById(id);
          }

          set({ isLoading: false });
          toast.success('Maintenance record updated successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to update maintenance record: ${error.message}`);
          throw error;
        }
      },

      // Delete Record
      deleteRecord: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('vlms_maintenance_records')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Remove from local state
          set((state) => ({
            records: state.records.filter((r) => r.id !== id),
            selectedRecord: state.selectedRecord?.id === id ? null : state.selectedRecord,
            isLoading: false,
          }));

          toast.success('Maintenance record deleted successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to delete maintenance record: ${error.message}`);
          throw error;
        }
      },

      // Complete Service
      completeService: async (id: string, data: Partial<MaintenanceFormData>) => {
        set({ isLoading: true, error: null });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { error } = await supabase
            .from('vlms_maintenance_records')
            .update({
              ...data,
              status: 'completed',
              actual_date: data.actual_date || new Date().toISOString().split('T')[0],
              completed_by: user.user.id,
            })
            .eq('id', id);

          if (error) throw error;

          // Refresh records list
          await get().fetchRecords();

          set({ isLoading: false });
          toast.success('Service completed successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to complete service: ${error.message}`);
          throw error;
        }
      },
    }),
    { name: 'vlms-maintenance' }
  )
);

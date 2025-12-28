/**
 * VLMS Assignments Zustand Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { Assignment, AssignmentFormData, AssignmentFilters } from '@/types/vlms';
import { toast } from 'sonner';

interface AssignmentsState {
  assignments: Assignment[];
  filters: AssignmentFilters;
  isLoading: boolean;
  fetchAssignments: (vehicleId?: string) => Promise<void>;
  createAssignment: (data: AssignmentFormData) => Promise<Assignment>;
  updateAssignment: (id: string, data: Partial<AssignmentFormData>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  setFilters: (filters: Partial<AssignmentFilters>) => void;
}

export const useAssignmentsStore = create<AssignmentsState>()(
  devtools(
    (set, get) => ({
      assignments: [],
      filters: {},
      isLoading: false,

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      fetchAssignments: async (vehicleId?: string) => {
        set({ isLoading: true });
        try {
          let query = supabase
            .from('vlms_assignments')
            .select(
              `
              *,
              vehicle:vehicles(id, vehicle_id, make, model, license_plate),
              assigned_to:profiles!vlms_assignments_assigned_to_id_fkey(id, full_name),
              assigned_location:facilities(id, name)
            `
            )
            .order('start_date', { ascending: false });

          if (vehicleId) query = query.eq('vehicle_id', vehicleId);

          const { data, error } = await query;
          if (error) throw error;

          set({ assignments: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed to fetch assignments: ${error.message}`);
        }
      },

      createAssignment: async (data: AssignmentFormData) => {
        set({ isLoading: true });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { data: assignment, error } = await supabase
            .from('vlms_assignments')
            .insert({ ...data, created_by: user.user.id })
            .select()
            .single();

          if (error) throw error;

          await get().fetchAssignments();
          set({ isLoading: false });
          toast.success('Assignment created');
          return assignment;
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed: ${error.message}`);
          throw error;
        }
      },

      updateAssignment: async (id: string, data: Partial<AssignmentFormData>) => {
        try {
          const { error } = await supabase
            .from('vlms_assignments')
            .update(data)
            .eq('id', id);

          if (error) throw error;

          await get().fetchAssignments();
          toast.success('Assignment updated');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },

      deleteAssignment: async (id: string) => {
        try {
          const { error } = await supabase
            .from('vlms_assignments')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            assignments: state.assignments.filter((a) => a.id !== id),
          }));
          toast.success('Assignment deleted');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },
    }),
    { name: 'vlms-assignments' }
  )
);

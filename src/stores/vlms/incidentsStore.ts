/**
 * VLMS Incidents Zustand Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { Incident, IncidentFormData, IncidentFilters } from '@/types/vlms';
import { toast } from 'sonner';

interface IncidentsState {
  incidents: Incident[];
  filters: IncidentFilters;
  isLoading: boolean;
  fetchIncidents: (vehicleId?: string) => Promise<void>;
  createIncident: (data: IncidentFormData) => Promise<Incident>;
  updateIncident: (id: string, data: Partial<IncidentFormData>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  setFilters: (filters: Partial<IncidentFilters>) => void;
}

export const useIncidentsStore = create<IncidentsState>()(
  devtools(
    (set, get) => ({
      incidents: [],
      filters: {},
      isLoading: false,

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      fetchIncidents: async (vehicleId?: string) => {
        set({ isLoading: true });
        try {
          let query = supabase
            .from('vlms_incidents')
            .select(
              `
              *,
              vehicle:vehicles(id, vehicle_id, make, model, license_plate),
              driver:profiles(id, full_name)
            `
            )
            .order('incident_date', { ascending: false });

          if (vehicleId) query = query.eq('vehicle_id', vehicleId);

          const { data, error } = await query;
          if (error) throw error;

          set({ incidents: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed to fetch incidents: ${error.message}`);
        }
      },

      createIncident: async (data: IncidentFormData) => {
        set({ isLoading: true });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { data: incident, error } = await supabase
            .from('vlms_incidents')
            .insert({ ...data, created_by: user.user.id })
            .select()
            .single();

          if (error) throw error;

          await get().fetchIncidents();
          set({ isLoading: false });
          toast.success('Incident reported');
          return incident;
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed: ${error.message}`);
          throw error;
        }
      },

      updateIncident: async (id: string, data: Partial<IncidentFormData>) => {
        try {
          const { error } = await supabase
            .from('vlms_incidents')
            .update(data)
            .eq('id', id);

          if (error) throw error;

          await get().fetchIncidents();
          toast.success('Incident updated');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },

      deleteIncident: async (id: string) => {
        try {
          const { error } = await supabase
            .from('vlms_incidents')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            incidents: state.incidents.filter((i) => i.id !== id),
          }));
          toast.success('Incident deleted');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },
    }),
    { name: 'vlms-incidents' }
  )
);

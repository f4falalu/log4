/**
 * VLMS Fuel Logs Zustand Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { FuelLog, FuelLogFormData, FuelLogFilters } from '@/types/vlms';
import { toast } from 'sonner';

interface FuelLogsState {
  logs: FuelLog[];
  filters: FuelLogFilters;
  isLoading: boolean;
  fetchLogs: (vehicleId?: string) => Promise<void>;
  createLog: (data: FuelLogFormData) => Promise<FuelLog>;
  deleteLog: (id: string) => Promise<void>;
  setFilters: (filters: Partial<FuelLogFilters>) => void;
}

export const useFuelLogsStore = create<FuelLogsState>()(
  devtools(
    (set, get) => ({
      logs: [],
      filters: {},
      isLoading: false,

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      fetchLogs: async (vehicleId?: string) => {
        set({ isLoading: true });
        try {
          let query = supabase
            .from('vlms_fuel_logs')
            .select('*, vehicle:vehicles(id, vehicle_id, make, model, license_plate)')
            .order('transaction_date', { ascending: false });

          if (vehicleId) query = query.eq('vehicle_id', vehicleId);

          const { data, error } = await query;
          if (error) throw error;

          set({ logs: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed to fetch fuel logs: ${error.message}`);
        }
      },

      createLog: async (data: FuelLogFormData) => {
        set({ isLoading: true });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { data: log, error } = await supabase
            .from('vlms_fuel_logs')
            .insert({ ...data, created_by: user.user.id })
            .select()
            .single();

          if (error) throw error;

          await get().fetchLogs();
          set({ isLoading: false });
          toast.success('Fuel log created');
          return log;
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed: ${error.message}`);
          throw error;
        }
      },

      deleteLog: async (id: string) => {
        try {
          const { error } = await supabase.from('vlms_fuel_logs').delete().eq('id', id);
          if (error) throw error;

          set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
          toast.success('Fuel log deleted');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },
    }),
    { name: 'vlms-fuel-logs' }
  )
);

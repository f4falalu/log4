/**
 * VLMS Inspections Zustand Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Inspection {
  id: string;
  inspection_id: string;
  vehicle_id: string;
  inspection_date: string;
  inspection_type: string;
  inspector_name: string;
  inspector_id: string | null;
  overall_status: string;
  roadworthy: boolean;
  meets_safety_standards: boolean;
  next_inspection_date: string | null;
  odometer_reading: number | null;
  notes: string | null;
  vehicle?: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  inspector?: {
    id: string;
    full_name: string;
  };
}

interface InspectionsState {
  inspections: Inspection[];
  isLoading: boolean;
  fetchInspections: (vehicleId?: string) => Promise<void>;
  deleteInspection: (id: string) => Promise<void>;
}

export const useInspectionsStore = create<InspectionsState>()(
  devtools(
    (set, get) => ({
      inspections: [],
      isLoading: false,

      fetchInspections: async (vehicleId?: string) => {
        set({ isLoading: true });
        try {
          let query = supabase
            .from('vlms_inspections')
            .select(
              `
              *,
              vehicle:vehicles(id, vehicle_id, make, model, license_plate),
              inspector:profiles!vlms_inspections_inspector_id_fkey(id, full_name)
            `
            )
            .order('inspection_date', { ascending: false });

          if (vehicleId) query = query.eq('vehicle_id', vehicleId);

          const { data, error } = await query;
          if (error) throw error;

          set({ inspections: data, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(`Failed to fetch inspections: ${error.message}`);
        }
      },

      deleteInspection: async (id: string) => {
        try {
          const { error } = await supabase
            .from('vlms_inspections')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            inspections: state.inspections.filter((i) => i.id !== id),
          }));
          toast.success('Inspection deleted');
        } catch (error: any) {
          toast.error(`Failed: ${error.message}`);
        }
      },
    }),
    { name: 'vlms-inspections' }
  )
);

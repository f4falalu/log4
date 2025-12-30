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

interface CreateInspectionData {
  vehicle_id: string;
  inspection_date: string;
  inspection_type: string;
  inspector_name: string;
  overall_status: string;
  roadworthy: boolean;
  meets_safety_standards: boolean;
  odometer_reading: number | null;
  notes: string | null;
  next_inspection_date: string | null;
}

interface InspectionsState {
  inspections: Inspection[];
  isLoading: boolean;
  isCreating: boolean;
  fetchInspections: (vehicleId?: string) => Promise<void>;
  createInspection: (data: CreateInspectionData) => Promise<boolean>;
  deleteInspection: (id: string) => Promise<void>;
}

export const useInspectionsStore = create<InspectionsState>()(
  devtools(
    (set, get) => ({
      inspections: [],
      isLoading: false,
      isCreating: false,

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

      createInspection: async (data: CreateInspectionData) => {
        set({ isCreating: true });
        try {
          // Generate inspection ID (format: INS-YYYYMMDD-XXX)
          const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const inspection_id = `INS-${date}-${randomSuffix}`;

          const { data: newInspection, error } = await supabase
            .from('vlms_inspections')
            .insert({
              inspection_id,
              ...data,
            })
            .select(
              `
              *,
              vehicle:vehicles(id, vehicle_id, make, model, license_plate),
              inspector:profiles!vlms_inspections_inspector_id_fkey(id, full_name)
            `
            )
            .single();

          if (error) throw error;

          set((state) => ({
            inspections: [newInspection, ...state.inspections],
            isCreating: false,
          }));
          toast.success('Inspection created successfully');
          return true;
        } catch (error: any) {
          set({ isCreating: false });
          toast.error(`Failed to create inspection: ${error.message}`);
          return false;
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

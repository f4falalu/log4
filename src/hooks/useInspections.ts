import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VlmsInspection {
  id: string;
  inspection_id: string;
  vehicle_id: string;
  inspection_date: string;
  inspection_type: 'routine' | 'pre_trip' | 'post_trip' | 'safety' | 'compliance' | 'damage_assessment';
  inspector_id?: string;
  inspector_name: string;
  inspector_certification?: string;
  odometer_reading?: number;
  overall_status: 'passed' | 'failed' | 'conditional' | 'pending';
  checklist: Record<string, boolean | string>;
  exterior_condition?: Record<string, any>;
  interior_condition?: Record<string, any>;
  engine_mechanical?: Record<string, any>;
  electrical_system?: Record<string, any>;
  brakes?: Record<string, any>;
  tires?: Record<string, any>;
  lights_signals?: Record<string, any>;
  safety_equipment?: Record<string, any>;
  fluid_levels?: Record<string, any>;
  defects_found?: string[];
  priority_repairs?: string[];
  repair_recommendations?: string;
  estimated_repair_cost?: number;
  repair_deadline?: string;
  next_inspection_date?: string;
  reinspection_required: boolean;
  meets_safety_standards: boolean;
  roadworthy: boolean;
  notes?: string;
  images?: string[];
  signature_inspector?: string;
  signature_driver?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface InspectionFormData {
  vehicle_id: string;
  inspection_date: string;
  inspection_type: VlmsInspection['inspection_type'];
  inspector_name: string;
  inspector_certification?: string;
  odometer_reading?: number;
  overall_status: VlmsInspection['overall_status'];
  checklist: Record<string, boolean | string>;
  exterior_condition?: Record<string, any>;
  interior_condition?: Record<string, any>;
  engine_mechanical?: Record<string, any>;
  electrical_system?: Record<string, any>;
  brakes?: Record<string, any>;
  tires?: Record<string, any>;
  lights_signals?: Record<string, any>;
  safety_equipment?: Record<string, any>;
  fluid_levels?: Record<string, any>;
  defects_found?: string[];
  priority_repairs?: string[];
  repair_recommendations?: string;
  estimated_repair_cost?: number;
  repair_deadline?: string;
  next_inspection_date?: string;
  reinspection_required: boolean;
  meets_safety_standards: boolean;
  roadworthy: boolean;
  notes?: string;
}

// Fetch all inspections
export function useInspections() {
  return useQuery({
    queryKey: ['vlms-inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vlms_inspections')
        .select(`
          *,
          vehicle:vlms_vehicles(
            id,
            vehicle_id,
            type,
            make,
            model,
            license_plate
          )
        `)
        .order('inspection_date', { ascending: false });

      if (error) throw error;
      return data as (VlmsInspection & { vehicle: any })[];
    },
  });
}

// Fetch inspections by vehicle
export function useInspectionsByVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vlms-inspections', 'vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('vlms_inspections')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('inspection_date', { ascending: false });

      if (error) throw error;
      return data as VlmsInspection[];
    },
    enabled: !!vehicleId,
  });
}

// Fetch single inspection
export function useInspectionById(id: string | undefined) {
  return useQuery({
    queryKey: ['vlms-inspections', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('vlms_inspections')
        .select(`
          *,
          vehicle:vlms_vehicles(
            id,
            vehicle_id,
            type,
            make,
            model,
            license_plate,
            vin
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as VlmsInspection & { vehicle: any };
    },
    enabled: !!id,
  });
}

// Create inspection
export function useCreateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InspectionFormData) => {
      // Generate inspection ID
      const inspectionId = `INS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const { data: inspection, error } = await supabase
        .from('vlms_inspections')
        .insert({
          inspection_id: inspectionId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return inspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlms-inspections'] });
      toast.success('Inspection Created', {
        description: 'Vehicle inspection has been recorded successfully.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Create Inspection', {
        description: error.message || 'An error occurred while creating the inspection.',
      });
    },
  });
}

// Update inspection
export function useUpdateInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<VlmsInspection> & { id: string }) => {
      const { data: inspection, error } = await supabase
        .from('vlms_inspections')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return inspection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vlms-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['vlms-inspections', variables.id] });
      toast.success('Inspection Updated', {
        description: 'Inspection details have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Update Inspection', {
        description: error.message || 'An error occurred while updating the inspection.',
      });
    },
  });
}

// Delete inspection
export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vlms_inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlms-inspections'] });
      toast.success('Inspection Deleted', {
        description: 'The inspection record has been removed.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Delete Inspection', {
        description: error.message || 'An error occurred while deleting the inspection.',
      });
    },
  });
}

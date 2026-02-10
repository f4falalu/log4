import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ServiceArea,
  ServiceAreaFacility,
  CreateServiceAreaInput,
  UpdateServiceAreaInput,
} from '@/types/service-areas';
import { toast } from 'sonner';

export interface ServiceAreaFilters {
  zone_id?: string;
  warehouse_id?: string;
  service_type?: string;
  is_active?: boolean;
  search?: string;
}

/**
 * Fetch all service areas with optional filters and joins
 */
export function useServiceAreas(filters?: ServiceAreaFilters) {
  return useQuery({
    queryKey: ['service-areas', filters],
    queryFn: async () => {
      let query = supabase
        .from('service_areas')
        .select(`
          *,
          zones:zone_id (id, name, code),
          warehouses:warehouse_id (id, name, lat, lng)
        `)
        .order('name', { ascending: true });

      if (filters?.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }
      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }
      if (filters?.service_type) {
        query = query.eq('service_type', filters.service_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch service areas: ${error.message}`);

      // Enrich with facility counts
      const serviceAreas = (data || []) as unknown as ServiceArea[];
      if (serviceAreas.length > 0) {
        const ids = serviceAreas.map(sa => sa.id);
        const { data: facCounts } = await supabase
          .from('service_area_facilities')
          .select('service_area_id')
          .in('service_area_id', ids);

        const countMap: Record<string, number> = {};
        facCounts?.forEach(f => {
          countMap[f.service_area_id] = (countMap[f.service_area_id] || 0) + 1;
        });
        serviceAreas.forEach(sa => {
          sa.facility_count = countMap[sa.id] || 0;
        });
      }

      return serviceAreas;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch a single service area by ID
 */
export function useServiceArea(id: string | null | undefined) {
  return useQuery({
    queryKey: ['service-area', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('service_areas')
        .select(`
          *,
          zones:zone_id (id, name, code),
          warehouses:warehouse_id (id, name, lat, lng)
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(`Failed to fetch service area: ${error.message}`);
      return data as unknown as ServiceArea;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch facilities assigned to a service area
 */
export function useServiceAreaFacilities(serviceAreaId: string | null | undefined) {
  return useQuery({
    queryKey: ['service-area-facilities', serviceAreaId],
    queryFn: async () => {
      if (!serviceAreaId) return [];

      const { data, error } = await supabase
        .from('service_area_facilities')
        .select(`
          *,
          facilities:facility_id (
            id, name, lat, lng, type, level_of_care, lga
          )
        `)
        .eq('service_area_id', serviceAreaId);

      if (error) throw new Error(`Failed to fetch service area facilities: ${error.message}`);
      return (data || []) as unknown as ServiceAreaFacility[];
    },
    enabled: !!serviceAreaId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new service area with facility assignments
 */
export function useCreateServiceArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceAreaInput) => {
      const { facility_ids, ...serviceAreaData } = input;

      // Insert service area
      const { data: sa, error: saError } = await supabase
        .from('service_areas')
        .insert([serviceAreaData])
        .select()
        .single();

      if (saError) throw saError;

      // Bulk insert facility assignments
      if (facility_ids.length > 0) {
        const assignments = facility_ids.map(fid => ({
          service_area_id: sa.id,
          facility_id: fid,
        }));

        const { error: facError } = await supabase
          .from('service_area_facilities')
          .insert(assignments);

        if (facError) throw facError;
      }

      return sa as unknown as ServiceArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      queryClient.invalidateQueries({ queryKey: ['service-area-facilities'] });
      toast.success('Service area created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create service area: ${error.message}`);
    },
  });
}

/**
 * Update a service area
 */
export function useUpdateServiceArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateServiceAreaInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('service_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServiceArea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      queryClient.invalidateQueries({ queryKey: ['service-area', data.id] });
      toast.success('Service area updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update service area: ${error.message}`);
    },
  });
}

/**
 * Delete a service area (cascades to facility assignments)
 */
export function useDeleteServiceArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      queryClient.invalidateQueries({ queryKey: ['service-area-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Service area deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete service area: ${error.message}`);
    },
  });
}

/**
 * Assign facilities to a service area (replace all assignments)
 */
export function useAssignFacilitiesToServiceArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceAreaId, facilityIds }: { serviceAreaId: string; facilityIds: string[] }) => {
      // Remove existing assignments
      const { error: deleteError } = await supabase
        .from('service_area_facilities')
        .delete()
        .eq('service_area_id', serviceAreaId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (facilityIds.length > 0) {
        const assignments = facilityIds.map(fid => ({
          service_area_id: serviceAreaId,
          facility_id: fid,
        }));

        const { error: insertError } = await supabase
          .from('service_area_facilities')
          .insert(assignments);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      queryClient.invalidateQueries({ queryKey: ['service-area-facilities'] });
      toast.success('Facility assignments updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign facilities: ${error.message}`);
    },
  });
}

/**
 * Aggregate metrics across all service areas
 */
export function useServiceAreaMetrics() {
  return useQuery({
    queryKey: ['service-area-metrics'],
    queryFn: async () => {
      const { data: areas, error } = await supabase
        .from('service_areas')
        .select('id, priority, max_distance_km, is_active');

      if (error) throw error;

      const { count: facilityCount } = await supabase
        .from('service_area_facilities')
        .select('*', { count: 'exact', head: true });

      const activeAreas = areas?.filter(a => a.is_active) || [];
      const criticalCount = areas?.filter(a => a.priority === 'critical').length || 0;
      const distances = areas?.map(a => a.max_distance_km).filter(Boolean) as number[];
      const avgDistance = distances.length > 0
        ? distances.reduce((s, d) => s + d, 0) / distances.length
        : 0;

      return {
        totalServiceAreas: areas?.length || 0,
        activeServiceAreas: activeAreas.length,
        facilitiesCovered: facilityCount || 0,
        criticalCount,
        avgDistance: Math.round(avgDistance * 10) / 10,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

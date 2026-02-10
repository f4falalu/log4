import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Route,
  RouteFacility,
  CreateRouteInput,
} from '@/types/routes';
import { toast } from 'sonner';

export interface RouteFilters {
  zone_id?: string;
  service_area_id?: string;
  status?: string;
  is_sandbox?: boolean;
  search?: string;
}

/**
 * Fetch all routes with optional filters and joins
 */
export function useRoutes(filters?: RouteFilters) {
  return useQuery({
    queryKey: ['routes', filters],
    queryFn: async () => {
      let query = supabase
        .from('routes')
        .select(`
          *,
          zones:zone_id (id, name),
          service_areas:service_area_id (id, name),
          warehouses:warehouse_id (id, name, lat, lng)
        `)
        .order('created_at', { ascending: false });

      if (filters?.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }
      if (filters?.service_area_id) {
        query = query.eq('service_area_id', filters.service_area_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.is_sandbox !== undefined) {
        query = query.eq('is_sandbox', filters.is_sandbox);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch routes: ${error.message}`);

      // Enrich with facility counts
      const routes = (data || []) as unknown as Route[];
      if (routes.length > 0) {
        const ids = routes.map(r => r.id);
        const { data: facCounts } = await supabase
          .from('route_facilities')
          .select('route_id')
          .in('route_id', ids);

        const countMap: Record<string, number> = {};
        facCounts?.forEach(f => {
          countMap[f.route_id] = (countMap[f.route_id] || 0) + 1;
        });
        routes.forEach(r => {
          r.facility_count = countMap[r.id] || 0;
        });
      }

      return routes;
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch a single route by ID with full details
 */
export function useRoute(id: string | null | undefined) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          zones:zone_id (id, name),
          service_areas:service_area_id (id, name),
          warehouses:warehouse_id (id, name, lat, lng)
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(`Failed to fetch route: ${error.message}`);
      return data as unknown as Route;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch ordered facilities for a route
 */
export function useRouteFacilities(routeId: string | null | undefined) {
  return useQuery({
    queryKey: ['route-facilities', routeId],
    queryFn: async () => {
      if (!routeId) return [];

      const { data, error } = await supabase
        .from('route_facilities')
        .select(`
          *,
          facilities:facility_id (
            id, name, lat, lng, type, level_of_care, lga
          )
        `)
        .eq('route_id', routeId)
        .order('sequence_order', { ascending: true });

      if (error) throw new Error(`Failed to fetch route facilities: ${error.message}`);
      return (data || []) as unknown as RouteFacility[];
    },
    enabled: !!routeId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new route with facility sequence
 */
export function useCreateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRouteInput) => {
      const { facility_ids, ...routeData } = input;

      // Insert route
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert([routeData])
        .select()
        .single();

      if (routeError) throw routeError;

      // Insert route facilities with sequence order
      if (facility_ids.length > 0) {
        const routeFacilities = facility_ids.map((fid, idx) => ({
          route_id: route.id,
          facility_id: fid,
          sequence_order: idx + 1,
        }));

        const { error: facError } = await supabase
          .from('route_facilities')
          .insert(routeFacilities);

        if (facError) throw facError;
      }

      return route as unknown as Route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['route-metrics'] });
      toast.success('Route created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });
}

/**
 * Update a route (will fail for locked routes via DB trigger)
 */
export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Route> }) => {
      const { data: result, error } = await supabase
        .from('routes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as Route;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route', data.id] });
      toast.success('Route updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });
}

/**
 * Lock a route (makes it immutable)
 */
export function useLockRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('routes')
        .update({
          status: 'locked',
          locked_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Route;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route', data.id] });
      toast.success('Route locked successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to lock route: ${error.message}`);
    },
  });
}

/**
 * Delete a route (will fail for locked routes via DB trigger)
 */
export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['route-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['route-metrics'] });
      toast.success('Route deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route: ${error.message}`);
    },
  });
}

/**
 * Aggregate metrics across all routes
 */
export function useRouteMetrics() {
  return useQuery({
    queryKey: ['route-metrics'],
    queryFn: async () => {
      const { data: routes, error } = await supabase
        .from('routes')
        .select('id, status, total_distance_km, is_sandbox');

      if (error) throw error;

      const production = routes?.filter(r => !r.is_sandbox) || [];
      const sandbox = routes?.filter(r => r.is_sandbox) || [];
      const activeRoutes = production.filter(r => r.status === 'active');
      const lockedRoutes = production.filter(r => r.status === 'locked');
      const distances = production
        .map(r => r.total_distance_km)
        .filter(Boolean) as number[];
      const totalDistance = distances.reduce((s, d) => s + d, 0);

      return {
        totalRoutes: production.length,
        activeRoutes: activeRoutes.length,
        lockedRoutes: lockedRoutes.length,
        sandboxRoutes: sandbox.length,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

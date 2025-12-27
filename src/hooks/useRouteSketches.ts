/**
 * Route Sketches Hook
 *
 * Provides React Query hooks for managing route sketches in planning mode
 * Route sketches are non-binding previews (active=false by default)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RouteSketch {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  route_geometry: any; // GeoJSON LineString
  waypoints: any[]; // Array of waypoint objects
  start_facility_id: string | null;
  end_facility_id: string | null;
  estimated_distance: number | null;
  estimated_duration: number | null;
  route_type: string;
  active: boolean;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all route sketches (active and drafts)
 */
export function useRouteSketches(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['route-sketches', options?.activeOnly],
    queryFn: async () => {
      let query = supabase.from('route_sketches').select('*').order('created_at', { ascending: false });

      if (options?.activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as RouteSketch[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch draft route sketches only
 */
export function useDraftRouteSketches() {
  return useQuery({
    queryKey: ['route-sketches', 'drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_sketches')
        .select('*')
        .eq('active', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RouteSketch[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute (drafts change more frequently)
  });
}

/**
 * Fetch a single route sketch by ID
 */
export function useRouteSketch(id: string | null) {
  return useQuery({
    queryKey: ['route-sketch', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('route_sketches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as RouteSketch;
    },
    enabled: !!id,
  });
}

/**
 * Create a new route sketch (non-binding by default)
 */
export function useCreateRouteSketch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspace_id: string;
      name: string;
      description?: string;
      route_geometry: any; // GeoJSON LineString
      waypoints: any[];
      start_facility_id?: string;
      end_facility_id?: string;
      estimated_distance?: number;
      estimated_duration?: number;
      route_type: 'delivery' | 'pickup' | 'transfer';
      metadata?: Record<string, any>;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('route_sketches')
        .insert([
          {
            ...data,
            active: false, // NON-BINDING by default
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return result as RouteSketch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-sketches'] });
      toast.success('Route sketch saved (non-binding preview - requires activation)');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create route sketch');
    },
  });
}

/**
 * Update an existing route sketch
 */
export function useUpdateRouteSketch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RouteSketch> }) => {
      const { data: result, error } = await supabase
        .from('route_sketches')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as RouteSketch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['route-sketches'] });
      queryClient.invalidateQueries({ queryKey: ['route-sketch', variables.id] });
      toast.success('Route sketch updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update route sketch');
    },
  });
}

/**
 * Activate a route sketch
 */
export function useActivateRouteSketch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: string; reviewNotes?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('route_sketches')
        .update({
          active: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RouteSketch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-sketches'] });
      toast.success('Route sketch activated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate route sketch');
    },
  });
}

/**
 * Deactivate a route sketch
 */
export function useDeactivateRouteSketch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('route_sketches')
        .update({
          active: false,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RouteSketch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-sketches'] });
      toast.success('Route sketch deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate route sketch');
    },
  });
}

/**
 * Delete a route sketch
 */
export function useDeleteRouteSketch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('route_sketches').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-sketches'] });
      toast.success('Route sketch deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete route sketch');
    },
  });
}

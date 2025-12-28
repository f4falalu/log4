/**
 * Zone Configurations Hook
 *
 * Provides React Query hooks for managing zone configurations in planning mode
 * Supports draft workflow (active=false by default)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ZoneConfiguration {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  boundary: any; // GeoJSON Polygon
  centroid: any; // GeoJSON Point
  version: number;
  parent_version_id: string | null;
  active: boolean;
  draft_created_by: string | null;
  draft_created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  activated_by: string | null;
  activated_at: string | null;
  deactivated_by: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  assigned_facility_ids: string[];
  zone_type: string;
  priority: number;
  capacity_limit: number | null;
  target_delivery_time: number | null;
  target_success_rate: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all zone configurations (active and drafts)
 */
export function useZoneConfigurations(options?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['zone-configurations', options?.activeOnly],
    queryFn: async () => {
      let query = supabase.from('zone_configurations').select('*').order('created_at', { ascending: false });

      if (options?.activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ZoneConfiguration[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch draft zone configurations only
 */
export function useDraftZoneConfigurations() {
  return useQuery({
    queryKey: ['zone-configurations', 'drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zone_configurations')
        .select('*')
        .eq('active', false)
        .order('draft_created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ZoneConfiguration[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute (drafts change more frequently)
  });
}

/**
 * Fetch a single zone configuration by ID
 */
export function useZoneConfiguration(id: string | null) {
  return useQuery({
    queryKey: ['zone-configuration', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('zone_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ZoneConfiguration;
    },
    enabled: !!id,
  });
}

/**
 * Create a new zone configuration (draft by default)
 */
export function useCreateZoneConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspace_id: string;
      name: string;
      description?: string;
      boundary: any; // GeoJSON Polygon
      zone_type?: string;
      priority?: number;
      capacity_limit?: number;
      target_delivery_time?: number;
      target_success_rate?: number;
      metadata?: Record<string, any>;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('zone_configurations')
        .insert([
          {
            ...data,
            active: false, // DRAFT by default
            version: 1,
            draft_created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return result as ZoneConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-configurations'] });
      toast.success('Zone configuration saved as draft (requires activation)');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create zone configuration');
    },
  });
}

/**
 * Update an existing zone configuration
 */
export function useUpdateZoneConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ZoneConfiguration> }) => {
      const { data: result, error } = await supabase
        .from('zone_configurations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as ZoneConfiguration;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['zone-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['zone-configuration', variables.id] });
      toast.success('Zone configuration updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update zone configuration');
    },
  });
}

/**
 * Activate a zone configuration (uses database function for version management)
 */
export function useActivateZoneConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zoneId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('activate_zone_configuration', {
        p_zone_id: zoneId,
        p_activated_by: user.id,
      });

      if (error) throw error;
      return zoneId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-configurations'] });
      toast.success('Zone configuration activated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate zone configuration');
    },
  });
}

/**
 * Deactivate a zone configuration
 */
export function useDeactivateZoneConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zone_configurations')
        .update({
          active: false,
          deactivated_by: user.id,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ZoneConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-configurations'] });
      toast.success('Zone configuration deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate zone configuration');
    },
  });
}

/**
 * Delete a zone configuration
 */
export function useDeleteZoneConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('zone_configurations').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-configurations'] });
      toast.success('Zone configuration deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete zone configuration');
    },
  });
}

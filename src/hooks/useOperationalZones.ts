import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OperationalZone, ZoneFilterOptions } from '@/types/zones';

export const useOperationalZones = () => {
  const [zones, setZones] = useState<OperationalZone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all operational zones
  const fetchZones = useCallback(async (filters?: ZoneFilterOptions) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('zones')
        .select('*')
        .eq('type', 'operational');

      // Apply filters if provided
      if (filters) {
        if (filters.zone_type) {
          query = query.in('type', filters.zone_type);
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters.tags && filters.tags.length > 0) {
          query = query.contains('tags', filters.tags);
        }
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      // Cast the data to OperationalZone[] since we know the type
      const operationalZones = (data || []) as unknown as OperationalZone[];
      setZones(operationalZones);
      
      return operationalZones;
    } catch (err) {
      console.error('Error fetching operational zones:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch operational zones'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new operational zone
  const createZone = async (zoneData: Omit<OperationalZone, 'id' | 'created_at' | 'updated_at' | 'type'>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('zones')
        .insert([
          {
            ...zoneData,
            type: 'operational',
            is_active: true,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the zones list
      await fetchZones();
      return data as OperationalZone;
    } catch (err) {
      console.error('Error creating operational zone:', err);
      setError(err instanceof Error ? err : new Error('Failed to create operational zone'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing operational zone
  const updateZone = async (id: string, updates: Partial<OperationalZone>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the zones list
      await fetchZones();
      return data as OperationalZone;
    } catch (err) {
      console.error('Error updating operational zone:', err);
      setError(err instanceof Error ? err : new Error('Failed to update operational zone'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an operational zone
  const deleteZone = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh the zones list
      await fetchZones();
    } catch (err) {
      console.error('Error deleting operational zone:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete operational zone'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get a single operational zone by ID
  const getZoneById = async (id: string): Promise<OperationalZone | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('id', id)
        .eq('type', 'operational')
        .single();

      if (error) throw error;
      
      return data as OperationalZone;
    } catch (err) {
      console.error('Error fetching operational zone:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch operational zone'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return {
    zones,
    loading,
    error,
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
    getZoneById,
  };
};

// React Query mutation hooks
export const useCreateZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (zoneData: any) => {
      const { data, error } = await supabase
        .from('zones')
        .insert([{ ...zoneData, type: 'operational', is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
    },
  });
};

export const useUpdateZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('zones')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
    },
  });
};

export const useDeleteZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['operational-zones'] });
    },
  });
};

export const useZoneSummary = (zoneId: string) => {
  return useQuery({
    queryKey: ['zone-summary', zoneId],
    queryFn: async () => {
      // Get zone basic data
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .eq('id', zoneId)
        .single();

      if (zoneError) throw zoneError;

      // Get facilities count in this zone
      const { count: facilitiesCount } = await supabase
        .from('facilities')
        .select('*', { count: 'exact', head: true })
        .eq('zone_id', zoneId)
        .eq('is_active', true);

      // Get LGAs count
      const { count: lgasCount } = await supabase
        .from('lgas')
        .select('*', { count: 'exact', head: true })
        .eq('zone_id', zoneId)
        .eq('is_active', true);

      return {
        zone,
        facilitiesCount: facilitiesCount || 0,
        lgasCount: lgasCount || 0,
      };
    },
    enabled: !!zoneId,
  });
};

export const useZoneMetrics = () => {
  return useQuery({
    queryKey: ['zone-metrics'],
    queryFn: async () => {
      // Get all zones
      const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .select('*')
        .eq('type', 'operational');

      if (zonesError) throw zonesError;

      // Get total facilities
      const { count: totalFacilities } = await supabase
        .from('facilities')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total LGAs
      const { count: totalLGAs } = await supabase
        .from('lgas')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return {
        totalZones: zones?.length || 0,
        activeZones: zones?.filter(z => z.is_active).length || 0,
        totalFacilities: totalFacilities || 0,
        totalLGAs: totalLGAs || 0,
      };
    },
  });
};

export default useOperationalZones;

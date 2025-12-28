import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Facility {
  id: string;
  name: string;
  address: string;
  state: string;
  lga: string | null;
  type: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  // Note: is_active column doesn't exist in facilities table
  // Add other facility fields as needed
}

interface FacilityFilterOptions {
  state?: string;
  lga?: string;
  type?: string;
  search?: string;
  // Note: is_active removed - column doesn't exist in facilities table
}

export const useFacilities = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all facilities with optional filters
  const fetchFacilities = useCallback(async (filters?: FacilityFilterOptions) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('facilities')
        .select('*');

      // Apply filters if provided
      if (filters) {
        if (filters.state) {
          query = query.eq('state', filters.state);
        }
        if (filters.lga) {
          query = query.eq('lga', filters.lga);
        }
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
        // Note: is_active column doesn't exist in facilities table
        // Removed: if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      setFacilities(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch facilities'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single facility by ID
  const getFacilityById = useCallback(async (id: string): Promise<Facility | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return data as Facility;
    } catch (err) {
      console.error('Error fetching facility:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch facility'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new facility
  const createFacility = async (facilityData: Omit<Facility, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the facilities list
      await fetchFacilities();
      return data as Facility;
    } catch (err) {
      console.error('Error creating facility:', err);
      setError(err instanceof Error ? err : new Error('Failed to create facility'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing facility
  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the facilities list
      await fetchFacilities();
      return data as Facility;
    } catch (err) {
      console.error('Error updating facility:', err);
      setError(err instanceof Error ? err : new Error('Failed to update facility'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a facility (soft delete)
  const deleteFacility = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('facilities')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh the facilities list
      await fetchFacilities();
    } catch (err) {
      console.error('Error deleting facility:', err);
      setError(err instanceof Error ? err : new Error('Failed to delete facility'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get unique states from facilities
  const getUniqueStates = useCallback((): string[] => {
    const states = new Set<string>();
    facilities.forEach(facility => {
      if (facility.state) {
        states.add(facility.state);
      }
    });
    return Array.from(states).sort();
  }, [facilities]);

  // Get unique LGAs from facilities, optionally filtered by state
  const getUniqueLGAs = useCallback((state?: string): string[] => {
    const lgas = new Set<string>();
    facilities.forEach(facility => {
      if (facility.lga && (!state || facility.state === state)) {
        lgas.add(facility.lga);
      }
    });
    return Array.from(lgas).sort();
  }, [facilities]);

  // Initial fetch
  useEffect(() => {
    fetchFacilities(); // Fetch all facilities (is_active column doesn't exist)
  }, [fetchFacilities]);

  return {
    facilities,
    loading,
    error,
    fetchFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility,
    getUniqueStates,
    getUniqueLGAs,
  };
};

// React Query mutation hook for adding facilities
export const useAddFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facilityData: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      type?: 'hospital' | 'clinic' | 'health_center' | 'pharmacy' | 'lab' | 'other';
      phone?: string;
      contactPerson?: string;
      capacity?: number;
      operatingHours?: string;
    }) => {
      const { data, error} = await supabase
        .from('facilities')
        .insert({
          name: facilityData.name,
          address: facilityData.address,
          lat: facilityData.lat,
          lng: facilityData.lng,
          type: facilityData.type,
          phone: facilityData.phone,
          contact_person: facilityData.contactPerson,
          capacity: facilityData.capacity,
          operating_hours: facilityData.operatingHours,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch facilities query
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

// React Query mutation hooks
export const useCreateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facilityData: any) => {
      const { data, error } = await supabase
        .from('facilities')
        .insert([facilityData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

export const useUpdateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('facilities')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('facilities')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

export const useBulkDeleteFacilities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('facilities')
        .update({
          deleted_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

// Hooks for facility detail data
export const useFacilityServices = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-services', facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facility_services')
        .select('*')
        .eq('facility_id', facilityId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });
};

export const useFacilityDeliveries = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-deliveries', facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });
};

export const useFacilityStock = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-stock', facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facility_stock')
        .select('*')
        .eq('facility_id', facilityId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });
};

export const useFacilityAuditLog = (facilityId: string) => {
  return useQuery({
    queryKey: ['facility-audit-log', facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
  });
};

export default useFacilities;

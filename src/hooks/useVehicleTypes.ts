/**
 * VLMS Vehicle Onboarding - Vehicle Types Hook
 * React Query hooks for fetching and managing vehicle types
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  VehicleType,
  VehicleTypeWithCategory,
  CreateVehicleTypePayload,
  TierConfig,
} from '@/types/vlms-onboarding';
import { toast } from 'sonner';

// =====================================================
// QUERY KEYS
// =====================================================

export const vehicleTypeKeys = {
  all: ['vehicle-types'] as const,
  lists: () => [...vehicleTypeKeys.all, 'list'] as const,
  list: (filters?: VehicleTypeFilters) => [...vehicleTypeKeys.lists(), filters] as const,
  details: () => [...vehicleTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleTypeKeys.details(), id] as const,
};

// =====================================================
// TYPES
// =====================================================

export interface VehicleTypeFilters {
  category_id?: string;
  search?: string;
}

// =====================================================
// QUERY FUNCTIONS
// =====================================================

/**
 * Fetch all vehicle types with optional filters
 */
async function fetchVehicleTypes(
  filters?: VehicleTypeFilters
): Promise<VehicleTypeWithCategory[]> {
  let query = supabase
    .from('vehicle_types')
    .select(
      `
      *,
      category:vehicle_categories(*)
    `
    )
    .order('name', { ascending: true });

  // Apply filters
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching vehicle types:', error);
    throw new Error(`Failed to fetch vehicle types: ${error.message}`);
  }

  return data as VehicleTypeWithCategory[];
}

/**
 * Fetch a single vehicle type by ID
 */
async function fetchVehicleType(id: string): Promise<VehicleTypeWithCategory> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .select(
      `
      *,
      category:vehicle_categories(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching vehicle type:', error);
    throw new Error(`Failed to fetch vehicle type: ${error.message}`);
  }

  return data as VehicleTypeWithCategory;
}

/**
 * Fetch vehicle types by category
 */
async function fetchVehicleTypesByCategory(
  categoryId: string
): Promise<VehicleTypeWithCategory[]> {
  return fetchVehicleTypes({ category_id: categoryId });
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Hook to fetch all vehicle types
 */
export function useVehicleTypes(filters?: VehicleTypeFilters) {
  return useQuery({
    queryKey: vehicleTypeKeys.list(filters),
    queryFn: () => fetchVehicleTypes(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch vehicle types for a specific category
 */
export function useVehicleTypesByCategory(categoryId: string) {
  return useQuery({
    queryKey: vehicleTypeKeys.list({ category_id: categoryId }),
    queryFn: () => fetchVehicleTypesByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single vehicle type by ID
 */
export function useVehicleType(id: string) {
  return useQuery({
    queryKey: vehicleTypeKeys.detail(id),
    queryFn: () => fetchVehicleType(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// =====================================================
// MUTATION FUNCTIONS
// =====================================================

interface CreateVehicleTypeInput {
  category_id: string;
  name: string;
  code?: string;
  description?: string;
  default_capacity_kg?: number;
  default_capacity_m3?: number;
  default_tier_config?: TierConfig[];
  icon_name?: string;
}

/**
 * Create a new vehicle type
 */
async function createVehicleType(input: CreateVehicleTypeInput): Promise<VehicleType> {
  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('vehicle_types')
    .insert({
      ...input,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating vehicle type:', error);
    throw new Error(`Failed to create vehicle type: ${error.message}`);
  }

  return data as VehicleType;
}

/**
 * Update a vehicle type
 */
async function updateVehicleType(
  id: string,
  updates: Partial<CreateVehicleTypeInput>
): Promise<VehicleType> {
  const { data, error } = await supabase
    .from('vehicle_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle type:', error);
    throw new Error(`Failed to update vehicle type: ${error.message}`);
  }

  return data as VehicleType;
}

/**
 * Delete a vehicle type
 */
async function deleteVehicleType(id: string): Promise<void> {
  const { error } = await supabase.from('vehicle_types').delete().eq('id', id);

  if (error) {
    console.error('Error deleting vehicle type:', error);
    throw new Error(`Failed to delete vehicle type: ${error.message}`);
  }
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Hook to create a new vehicle type
 */
export function useCreateVehicleType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVehicleType,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleTypeKeys.all });
      toast.success(`Vehicle type "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create vehicle type: ${error.message}`);
    },
  });
}

/**
 * Hook to update a vehicle type
 */
export function useUpdateVehicleType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateVehicleTypeInput> }) =>
      updateVehicleType(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleTypeKeys.all });
      toast.success(`Vehicle type "${data.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vehicle type: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a vehicle type
 */
export function useDeleteVehicleType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVehicleType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleTypeKeys.all });
      toast.success('Vehicle type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete vehicle type: ${error.message}`);
    },
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Group vehicle types by category
 */
export function groupTypesByCategory(types: VehicleTypeWithCategory[]): Record<string, VehicleTypeWithCategory[]> {
  return types.reduce((acc, type) => {
    if (!type.category_id) return acc;

    if (!acc[type.category_id]) {
      acc[type.category_id] = [];
    }

    acc[type.category_id].push(type);
    return acc;
  }, {} as Record<string, VehicleTypeWithCategory[]>);
}

/**
 * Filter types by search term
 */
export function filterTypes(types: VehicleType[], searchTerm: string): VehicleType[] {
  const term = searchTerm.toLowerCase();
  return types.filter(
    (t) =>
      t.name.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.code?.toLowerCase().includes(term)
  );
}

/**
 * Find type by code
 */
export function findTypeByCode(types: VehicleType[], code: string): VehicleType | undefined {
  return types.find((t) => t.code === code);
}

/**
 * Get types with default capacity
 */
export function getTypesWithCapacity(types: VehicleType[]): VehicleType[] {
  return types.filter(
    (t) => t.default_capacity_kg !== undefined || t.default_capacity_m3 !== undefined
  );
}

/**
 * Sort types by capacity
 */
export function sortTypesByCapacity(
  types: VehicleType[],
  by: 'weight' | 'volume' = 'weight'
): VehicleType[] {
  return [...types].sort((a, b) => {
    const aCapacity = by === 'weight' ? a.default_capacity_kg ?? 0 : a.default_capacity_m3 ?? 0;
    const bCapacity = by === 'weight' ? b.default_capacity_kg ?? 0 : b.default_capacity_m3 ?? 0;
    return bCapacity - aCapacity; // Descending order
  });
}

/**
 * Get type display info (for UI)
 */
export function getTypeDisplayInfo(type: VehicleType): {
  title: string;
  subtitle?: string;
  capacityText?: string;
} {
  const capacityParts: string[] = [];

  if (type.default_capacity_kg) {
    capacityParts.push(`${type.default_capacity_kg}kg`);
  }

  if (type.default_capacity_m3) {
    capacityParts.push(`${type.default_capacity_m3}m³`);
  }

  return {
    title: type.name,
    subtitle: type.description,
    capacityText: capacityParts.length > 0 ? capacityParts.join(' / ') : undefined,
  };
}

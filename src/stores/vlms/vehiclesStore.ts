/**
 * VLMS Vehicles Zustand Store
 * Manages vehicle state and operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import {
  Vehicle,
  VehicleWithRelations,
  VehicleFilters,
  VehicleFormData,
} from '@/types/vlms';
import { toast } from 'sonner';
import { getVehiclesTableName } from '@/lib/featureFlags';

export type ViewMode = 'list' | 'card' | 'table';

interface VehiclesState {
  // State
  vehicles: VehicleWithRelations[];
  selectedVehicle: VehicleWithRelations | null;
  filters: VehicleFilters;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  sidebarCollapsed: boolean;

  // Actions
  setVehicles: (vehicles: VehicleWithRelations[]) => void;
  setSelectedVehicle: (vehicle: VehicleWithRelations | null) => void;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  clearFilters: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;

  // Async Actions
  fetchVehicles: () => Promise<void>;
  fetchVehicleById: (id: string) => Promise<void>;
  createVehicle: (data: VehicleFormData) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<VehicleFormData>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  uploadDocument: (vehicleId: string, file: File, type: string) => Promise<void>;
  uploadPhoto: (vehicleId: string, file: File, caption?: string) => Promise<void>;
  removeDocument: (vehicleId: string, documentUrl: string) => Promise<void>;
  removePhoto: (vehicleId: string, photoUrl: string) => Promise<void>;
}

export const useVehiclesStore = create<VehiclesState>()(
  devtools(
    (set, get) => ({
      // Initial State
      vehicles: [],
      selectedVehicle: null,
      filters: {},
      isLoading: false,
      error: null,
      viewMode: (typeof window !== 'undefined' && localStorage.getItem('vehicleViewMode') as ViewMode) || 'table',
      sidebarCollapsed: (typeof window !== 'undefined' && localStorage.getItem('vehicleSidebarCollapsed') === 'true') || false,

      // Setters
      setVehicles: (vehicles) => set({ vehicles }),

      setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      clearFilters: () => set({ filters: {} }),

      setViewMode: (mode) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vehicleViewMode', mode);
        }
        set({ viewMode: mode });
      },

      toggleSidebar: () =>
        set((state) => {
          const newCollapsed = !state.sidebarCollapsed;
          if (typeof window !== 'undefined') {
            localStorage.setItem('vehicleSidebarCollapsed', String(newCollapsed));
          }
          return { sidebarCollapsed: newCollapsed };
        }),

      // Fetch Vehicles with Filters
      fetchVehicles: async () => {
        set({ isLoading: true, error: null });
        try {
          const { filters } = get();
          const tableName = getVehiclesTableName();

          // Build query
          let query = supabase
            .from(tableName)
            .select(
              `
              *,
              current_location:facilities!vehicles_current_location_id_fkey(id, name),
              current_driver:drivers!vehicles_current_driver_id_fkey(id, name, phone)
            `
            )
            .order('created_at', { ascending: false });

          // Apply filters
          if (filters.search) {
            query = query.or(
              `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%,vehicle_id.ilike.%${filters.search}%`
            );
          }

          if (filters.status) {
            query = query.eq('status', filters.status);
          }

          if (filters.vehicle_type) {
            query = query.eq('vehicle_type', filters.vehicle_type);
          }

          if (filters.fuel_type) {
            query = query.eq('fuel_type', filters.fuel_type);
          }

          if (filters.current_location_id) {
            query = query.eq('current_location_id', filters.current_location_id);
          }

          if (filters.current_driver_id) {
            query = query.eq('current_driver_id', filters.current_driver_id);
          }

          if (filters.make) {
            query = query.ilike('make', `%${filters.make}%`);
          }

          if (filters.year_from) {
            query = query.gte('year', filters.year_from);
          }

          if (filters.year_to) {
            query = query.lte('year', filters.year_to);
          }

          if (filters.acquisition_type) {
            query = query.eq('acquisition_type', filters.acquisition_type);
          }

          if (filters.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
          }

          const { data, error } = await query;

          if (error) throw error;

          set({ vehicles: data as VehicleWithRelations[], isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to fetch vehicles: ${error.message}`);
        }
      },

      // Fetch Single Vehicle with Relations
      fetchVehicleById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const tableName = getVehiclesTableName();
          const isUsingView = tableName === 'vehicles_unified_v';

          // Views don't support FK-based joins, so fetch vehicle data separately
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;

          // If using the base table (not view), fetch relationships separately
          let vehicleWithRelations = data as VehicleWithRelations;

          if (!isUsingView && data) {
            // Fetch related data separately
            if (data.current_location_id) {
              const { data: location } = await supabase
                .from('facilities')
                .select('id, name')
                .eq('id', data.current_location_id)
                .single();

              if (location) {
                vehicleWithRelations.current_location = location;
              }
            }

            if (data.current_driver_id) {
              const { data: driver } = await supabase
                .from('drivers')
                .select('id, name, phone')
                .eq('id', data.current_driver_id)
                .single();

              if (driver) {
                vehicleWithRelations.current_driver = {
                  id: driver.id,
                  full_name: driver.name,
                  email: '', // Email not available in drivers table
                };
              }
            }
          }

          set({ selectedVehicle: vehicleWithRelations, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to fetch vehicle: ${error.message}`);
        }
      },

      // Create Vehicle
      createVehicle: async (data: VehicleFormData | any) => {
        set({ isLoading: true, error: null });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          console.log('Creating vehicle with data:', data);

          // The deployed DB schema for `vehicles` has evolved over time.
          // To avoid PostgREST (PGRST204) hard-failing inserts when the client
          // sends fields that don't exist yet, we whitelist the columns we know
          // are safe for creation.
          //
          // NOTE: When new columns are added to the DB, add them here as well.
          const allowedInsertColumns = [
            // Identifiers
            'id',
            'vehicle_id',
            'category_id',
            'vehicle_type_id',
            'fleet_id',

            // Legacy core schema
            'type',
            'model',
            'plate_number',
            'capacity',
            'max_weight',
            'fuel_type',
            'avg_speed',
            'status',
            'current_driver_id',
            'fuel_efficiency',

            // Canonical/VLMS schema
            'make',
            'year',
            'license_plate',
            'vin',
            'transmission',
            'engine_capacity',
            'color',
            'seating_capacity',
            'current_location_id',
            'current_mileage',
            'insurance_provider',
            'insurance_policy_number',
            'insurance_expiry',
            'registration_expiry',
            'acquisition_date',
            'acquisition_type',
            'purchase_price',
            'notes',
            'tags',
            'documents',
            'photos',
            'photo_url',
            'thumbnail_url',
            'photo_uploaded_at',
            'ai_generated',
            'tiered_config',

            // Configurator compat fields (may or may not exist depending on DB)
            'variant',
            'length_cm',
            'width_cm',
            'height_cm',
            'capacity_m3',
            'capacity_kg',
            'gross_weight_kg',
            'axles',
            'number_of_wheels',
          ] as const;

          const insertPayload: Record<string, any> = {};
          for (const key of allowedInsertColumns) {
            if (data[key] !== undefined) insertPayload[key] = data[key];
          }

          // Backward compatibility: our UI uses `vehicle_type` but legacy schema uses `type`
          if (insertPayload.type === undefined && (data as any).vehicle_type) {
            insertPayload.type = (data as any).vehicle_type;
          }

          // Legacy schema requires plate_number - map from license_plate if present
          if (insertPayload.plate_number === undefined && (data as any).license_plate) {
            insertPayload.plate_number = (data as any).license_plate;
          }

          // Defensive: some date columns may be `date`/`timestamptz` in older schemas.
          // PostgREST will throw (e.g. 22007) if we send empty string.
          const dateLikeFields = [
            'acquisition_date',
            'insurance_expiry',
            'registration_expiry',
            'date_acquired',
          ] as const;
          for (const f of dateLikeFields) {
            if (insertPayload[f] === '') delete insertPayload[f];
          }

          const { data: vehicle, error } = await supabase
            .from('vehicles')
            .insert({
              ...insertPayload,
              created_by: user.user.id,
              updated_by: user.user.id,
            })
            .select()
            .single();

          if (error) {
            console.error('Supabase error creating vehicle:', error);
            throw error;
          }

          // Refresh vehicles list
          await get().fetchVehicles();

          set({ isLoading: false });
          toast.success('Vehicle created successfully');

          return vehicle;
        } catch (error: any) {
          console.error('Failed to create vehicle:', error);
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to create vehicle: ${error.message}`);
          throw error;
        }
      },

      // Update Vehicle
      updateVehicle: async (id: string, data: Partial<VehicleFormData>) => {
        set({ isLoading: true, error: null });
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          const { error } = await supabase
            .from('vehicles')
            .update({
              ...data,
              updated_by: user.user.id,
            })
            .eq('id', id);

          if (error) throw error;

          // Refresh vehicles list
          await get().fetchVehicles();

          // Refresh selected vehicle if it's the one being updated
          if (get().selectedVehicle?.id === id) {
            await get().fetchVehicleById(id);
          }

          set({ isLoading: false });
          toast.success('Vehicle updated successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to update vehicle: ${error.message}`);
          throw error;
        }
      },

      // Delete Vehicle
      deleteVehicle: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Remove from local state
          set((state) => ({
            vehicles: state.vehicles.filter((v) => v.id !== id),
            selectedVehicle: state.selectedVehicle?.id === id ? null : state.selectedVehicle,
            isLoading: false,
          }));

          toast.success('Vehicle deleted successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to delete vehicle: ${error.message}`);
          throw error;
        }
      },

      // Upload Document
      uploadDocument: async (vehicleId: string, file: File, type: string) => {
        set({ isLoading: true, error: null });
        try {
          // Upload file to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('vlms-documents')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('vlms-documents')
            .getPublicUrl(fileName);

          // Get current vehicle
          const { data: vehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('documents')
            .eq('id', vehicleId)
            .single();

          if (fetchError) throw fetchError;

          // Add new document to array
          const documents = vehicle.documents || [];
          documents.push({
            name: file.name,
            url: urlData.publicUrl,
            type,
            uploaded_at: new Date().toISOString(),
            size: file.size,
          });

          // Update vehicle with new documents array
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ documents })
            .eq('id', vehicleId);

          if (updateError) throw updateError;

          // Refresh vehicle
          await get().fetchVehicleById(vehicleId);

          set({ isLoading: false });
          toast.success('Document uploaded successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to upload document: ${error.message}`);
          throw error;
        }
      },

      // Upload Photo
      uploadPhoto: async (vehicleId: string, file: File, caption?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Upload file to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('vlms-photos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('vlms-photos')
            .getPublicUrl(fileName);

          // Get current vehicle
          const { data: vehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('photos')
            .eq('id', vehicleId)
            .single();

          if (fetchError) throw fetchError;

          // Add new photo to array
          const photos = vehicle.photos || [];
          photos.push({
            url: urlData.publicUrl,
            caption: caption || '',
            uploaded_at: new Date().toISOString(),
          });

          // Update vehicle with new photos array
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ photos })
            .eq('id', vehicleId);

          if (updateError) throw updateError;

          // Refresh vehicle
          await get().fetchVehicleById(vehicleId);

          set({ isLoading: false });
          toast.success('Photo uploaded successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to upload photo: ${error.message}`);
          throw error;
        }
      },

      // Remove Document
      removeDocument: async (vehicleId: string, documentUrl: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current vehicle
          const { data: vehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('documents')
            .eq('id', vehicleId)
            .single();

          if (fetchError) throw fetchError;

          // Remove document from array
          const documents = (vehicle.documents || []).filter(
            (doc: any) => doc.url !== documentUrl
          );

          // Update vehicle
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ documents })
            .eq('id', vehicleId);

          if (updateError) throw updateError;

          // Delete from storage
          const path = documentUrl.split('/vlms-documents/')[1];
          if (path) {
            await supabase.storage.from('vlms-documents').remove([path]);
          }

          // Refresh vehicle
          await get().fetchVehicleById(vehicleId);

          set({ isLoading: false });
          toast.success('Document removed successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to remove document: ${error.message}`);
          throw error;
        }
      },

      // Remove Photo
      removePhoto: async (vehicleId: string, photoUrl: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current vehicle
          const { data: vehicle, error: fetchError } = await supabase
            .from('vehicles')
            .select('photos')
            .eq('id', vehicleId)
            .single();

          if (fetchError) throw fetchError;

          // Remove photo from array
          const photos = (vehicle.photos || []).filter((photo: any) => photo.url !== photoUrl);

          // Update vehicle
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ photos })
            .eq('id', vehicleId);

          if (updateError) throw updateError;

          // Delete from storage
          const path = photoUrl.split('/vlms-photos/')[1];
          if (path) {
            await supabase.storage.from('vlms-photos').remove([path]);
          }

          // Refresh vehicle
          await get().fetchVehicleById(vehicleId);

          set({ isLoading: false });
          toast.success('Photo removed successfully');
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error(`Failed to remove photo: ${error.message}`);
          throw error;
        }
      },
    }),
    { name: 'vlms-vehicles' }
  )
);

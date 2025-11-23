/**
 * Zustand Store for Single-Screen Vehicle Configurator
 * Manages state for the new Tesla/Arrival-style vehicle onboarding UI
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  VehicleCategory,
  VehicleType,
  TierConfig,
  DimensionalConfig,
} from '@/types/vlms-onboarding';
import {
  calculateVolumeFromDimensions,
  createDefaultTierConfig,
} from '@/lib/vlms/capacityCalculations';

export interface AiAnalysisResult {
  dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  volume_m3: number;
  max_payload_kg: number;
  recommended_tiers: number;
  recommended_slots: {
    upper?: number;
    middle?: number;
    lower?: number;
  };
  confidence: number;
}

export interface VehicleConfiguratorState {
  // Category & Type
  selectedCategory: VehicleCategory | null;
  selectedType: VehicleType | null;
  modelName: string;

  // Basic Information
  vehicleName: string;
  variant: string;

  // Dimensions & Payload
  dimensions: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    volume_m3?: number;
  };
  payload: {
    gross_weight_kg?: number;
    max_payload_kg?: number;
  };

  // Specifications
  fuelType: string;
  transmission: string;
  year?: number;
  axles?: number;
  numberOfWheels?: number;

  // Acquisition
  dateAcquired: string;
  acquisitionMode: string;
  vendor: string;

  // Insurance & Registration
  licensePlate: string;
  registrationExpiry: string;
  insuranceExpiry: string;

  // Interior
  interiorDimensions: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  };
  numberOfSeats?: number;

  // Tier & Slot Configuration
  tiers: TierConfig[];

  // AI Assistance
  aiAnalysis: AiAnalysisResult | null;
  isAiProcessing: boolean;

  // UI State
  errors: Record<string, string>;
  isDirty: boolean;

  // Actions
  setCategory: (category: VehicleCategory | null) => void;
  setVehicleType: (type: VehicleType | null) => void;
  setModelName: (name: string) => void;
  setVehicleName: (name: string) => void;
  setVariant: (variant: string) => void;

  updateDimensions: (dimensions: Partial<VehicleConfiguratorState['dimensions']>) => void;
  updatePayload: (payload: Partial<VehicleConfiguratorState['payload']>) => void;

  setFuelType: (fuelType: string) => void;
  setTransmission: (transmission: string) => void;
  setYear: (year: number | undefined) => void;
  setAxles: (axles: number | undefined) => void;
  setNumberOfWheels: (wheels: number | undefined) => void;

  setDateAcquired: (date: string) => void;
  setAcquisitionMode: (mode: string) => void;
  setVendor: (vendor: string) => void;

  setLicensePlate: (plate: string) => void;
  setRegistrationExpiry: (date: string) => void;
  setInsuranceExpiry: (date: string) => void;

  updateInteriorDimensions: (dimensions: Partial<VehicleConfiguratorState['interiorDimensions']>) => void;
  setNumberOfSeats: (seats: number | undefined) => void;

  updateTierSlots: (tierIndex: number, newSlotCount: number) => void;
  setTiers: (tiers: TierConfig[]) => void;

  applyAiSuggestions: (analysis: AiAnalysisResult) => void;
  setAiProcessing: (processing: boolean) => void;

  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  reset: () => void;

  // Computed
  getFormData: () => any;
  isValid: () => boolean;
}

const initialState = {
  selectedCategory: null,
  selectedType: null,
  modelName: '',
  vehicleName: '',
  variant: '',
  dimensions: {},
  payload: {},
  fuelType: '',
  transmission: '',
  year: undefined,
  axles: undefined,
  numberOfWheels: undefined,
  dateAcquired: '',
  acquisitionMode: '',
  vendor: '',
  licensePlate: '',
  registrationExpiry: '',
  insuranceExpiry: '',
  interiorDimensions: {},
  numberOfSeats: undefined,
  tiers: createDefaultTierConfig(3, 1000, 10), // Default: 3 tiers, 1000kg, 10m³
  aiAnalysis: null,
  isAiProcessing: false,
  errors: {},
  isDirty: false,
};

export const useVehicleConfiguratorStore = create<VehicleConfiguratorState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setCategory: (category) => {
        set({
          selectedCategory: category,
          selectedType: null, // Reset type when category changes
          isDirty: true,
        });
      },

      setVehicleType: (type) => {
        set({ selectedType: type, isDirty: true });

        // Apply default capacity from type if available
        if (type?.default_capacity_kg || type?.default_capacity_m3) {
          const state = get();
          set({
            payload: {
              ...state.payload,
              max_payload_kg: type.default_capacity_kg || state.payload.max_payload_kg,
            },
            dimensions: {
              ...state.dimensions,
              volume_m3: type.default_capacity_m3 || state.dimensions.volume_m3,
            },
          });
        }

        // Apply default tier config from type if available
        if (type?.default_tier_config) {
          set({ tiers: type.default_tier_config as TierConfig[] });
        }
      },

      setModelName: (name) => set({ modelName: name, isDirty: true }),
      setVehicleName: (name) => set({ vehicleName: name, isDirty: true }),
      setVariant: (variant) => set({ variant, isDirty: true }),

      updateDimensions: (newDimensions) => {
        const state = get();
        const updated = { ...state.dimensions, ...newDimensions };

        // Auto-calculate volume if all dimensions provided
        if (updated.length_cm && updated.width_cm && updated.height_cm) {
          updated.volume_m3 = calculateVolumeFromDimensions(
            updated.length_cm,
            updated.width_cm,
            updated.height_cm
          );
        }

        set({ dimensions: updated, isDirty: true });
      },

      updatePayload: (newPayload) => {
        const state = get();
        set({
          payload: { ...state.payload, ...newPayload },
          isDirty: true,
        });
      },

      setFuelType: (fuelType) => set({ fuelType, isDirty: true }),
      setTransmission: (transmission) => set({ transmission, isDirty: true }),
      setYear: (year) => set({ year, isDirty: true }),
      setAxles: (axles) => set({ axles, isDirty: true }),
      setNumberOfWheels: (wheels) => set({ numberOfWheels: wheels, isDirty: true }),

      setDateAcquired: (date) => set({ dateAcquired: date, isDirty: true }),
      setAcquisitionMode: (mode) => set({ acquisitionMode: mode, isDirty: true }),
      setVendor: (vendor) => set({ vendor, isDirty: true }),

      setLicensePlate: (plate) => set({ licensePlate: plate, isDirty: true }),
      setRegistrationExpiry: (date) => set({ registrationExpiry: date, isDirty: true }),
      setInsuranceExpiry: (date) => set({ insuranceExpiry: date, isDirty: true }),

      updateInteriorDimensions: (newDimensions) => {
        const state = get();
        set({
          interiorDimensions: { ...state.interiorDimensions, ...newDimensions },
          isDirty: true,
        });
      },
      setNumberOfSeats: (seats) => set({ numberOfSeats: seats, isDirty: true }),

      updateTierSlots: (tierIndex, newSlotCount) => {
        const state = get();
        const updatedTiers = [...state.tiers];

        if (updatedTiers[tierIndex]) {
          updatedTiers[tierIndex] = {
            ...updatedTiers[tierIndex],
            slot_count: Math.max(1, Math.min(12, newSlotCount)), // Clamp between 1-12
          };

          set({ tiers: updatedTiers, isDirty: true });
        }
      },

      setTiers: (tiers) => set({ tiers, isDirty: true }),

      applyAiSuggestions: (analysis) => {
        const { dimensions_cm, volume_m3, max_payload_kg, recommended_tiers, recommended_slots } = analysis;

        // Apply dimensions
        set({
          dimensions: {
            length_cm: dimensions_cm.length,
            width_cm: dimensions_cm.width,
            height_cm: dimensions_cm.height,
            volume_m3,
          },
          payload: {
            max_payload_kg,
          },
          aiAnalysis: analysis,
          isDirty: true,
        });

        // Apply tier recommendations
        const tierNames = ['Upper', 'Middle', 'Lower'];
        const newTiers: TierConfig[] = [];

        for (let i = 0; i < recommended_tiers; i++) {
          const tierName = tierNames[i] || `Tier ${i + 1}`;
          const slotKey = tierName.toLowerCase() as keyof typeof recommended_slots;
          const slotCount = recommended_slots[slotKey] || 3;

          newTiers.push({
            tier_name: tierName,
            tier_order: i + 1,
            max_weight_kg: Math.round(max_payload_kg / recommended_tiers),
            max_volume_m3: Number((volume_m3 / recommended_tiers).toFixed(2)),
            slot_count: slotCount,
          });
        }

        set({ tiers: newTiers });
      },

      setAiProcessing: (processing) => set({ isAiProcessing: processing }),

      setError: (field, message) => {
        const state = get();
        set({ errors: { ...state.errors, [field]: message } });
      },

      clearError: (field) => {
        const state = get();
        const { [field]: _, ...rest } = state.errors;
        set({ errors: rest });
      },

      clearAllErrors: () => set({ errors: {} }),

      reset: () => set({ ...initialState, isDirty: false }),

      getFormData: () => {
        const state = get();
        const {
          selectedCategory,
          selectedType,
          modelName,
          vehicleName,
          variant,
          dimensions,
          payload,
          tiers,
          fuelType,
          transmission,
          year,
          axles,
          numberOfWheels,
          dateAcquired,
          acquisitionMode,
          vendor,
          licensePlate,
          registrationExpiry,
          insuranceExpiry,
          interiorDimensions,
          numberOfSeats,
        } = state;

        return {
          // Category & Type
          category_id: selectedCategory?.id,
          vehicle_type_id: selectedType?.id,
          model_name: modelName || selectedType?.name,

          // Basic Information
          vehicle_name: vehicleName,
          variant: variant,

          // Dimensions
          length_cm: dimensions.length_cm,
          width_cm: dimensions.width_cm,
          height_cm: dimensions.height_cm,
          capacity_m3: dimensions.volume_m3,

          // Payload
          gross_weight_kg: payload.gross_weight_kg,
          capacity_kg: payload.max_payload_kg,

          // Specifications
          fuel_type: fuelType,
          transmission: transmission,
          year: year,
          axles: axles,
          number_of_wheels: numberOfWheels,

          // Acquisition
          acquisition_date: dateAcquired,
          acquisition_type: acquisitionMode,
          vendor: vendor,

          // Insurance & Registration
          license_plate: licensePlate,
          registration_expiry: registrationExpiry,
          insurance_expiry: insuranceExpiry,

          // Interior
          interior_length_cm: interiorDimensions.length_cm,
          interior_width_cm: interiorDimensions.width_cm,
          interior_height_cm: interiorDimensions.height_cm,
          seating_capacity: numberOfSeats,

          // Tier configuration (JSONB)
          tiered_config: tiers.map(tier => ({
            tier_name: tier.tier_name,
            tier_order: tier.tier_order,
            max_weight_kg: tier.max_weight_kg,
            max_volume_m3: tier.max_volume_m3,
            slot_count: tier.slot_count,
          })),
        };
      },

      isValid: () => {
        const state = get();
        const {
          selectedCategory,
          dimensions,
          payload,
          modelName,
          licensePlate,
          year,
          fuelType,
          dateAcquired,
          acquisitionMode,
        } = state;

        // Category is required
        if (!selectedCategory) return false;

        // Either dimensions or manual capacity required
        const hasDimensions = dimensions.length_cm && dimensions.width_cm && dimensions.height_cm;
        const hasManualCapacity = dimensions.volume_m3 && payload.max_payload_kg;

        if (!hasDimensions && !hasManualCapacity) return false;

        // Required database fields (matching NOT NULL constraints)
        if (!modelName || modelName.trim() === '') return false;
        if (!licensePlate || licensePlate.trim() === '') return false;
        if (!year) return false;
        if (!fuelType || fuelType.trim() === '') return false;
        if (!dateAcquired || dateAcquired.trim() === '') return false;
        if (!acquisitionMode || acquisitionMode.trim() === '') return false;

        return true;
      },
    }),
    { name: 'vehicle-configurator' }
  )
);

import { create } from 'zustand';

export interface VehicleDraft {
  // Step 1 - Category
  category_id?: string;
  subcategory?: string;
  model: string;
  plate_number: string;
  fuel_type: 'diesel' | 'petrol' | 'electric';
  
  // Step 2 - Capacity & Tiers
  capacity: number;
  max_weight: number;
  tiers: Array<{
    name: string;
    ratio: number;
    capacity_kg: number;
  }>;
  
  // Step 3 - Operational
  avg_speed: number;
  fuel_efficiency: number;
  zone_id?: string;
  warehouse_id?: string;
  max_daily_distance: number;
  maintenance_frequency_km: number;
  
  // Step 4 - Media
  photo_url?: string;
  thumbnail_url?: string;
  ai_generated?: boolean;
}

interface WizardStore {
  currentStep: 1 | 2 | 3 | 4;
  draft: Partial<VehicleDraft>;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  updateDraft: (updates: Partial<VehicleDraft>) => void;
  reset: () => void;
  canProceed: (step: number) => boolean;
}

export const useVehicleWizard = create<WizardStore>((set, get) => ({
  currentStep: 1,
  draft: {
    model: '',
    plate_number: '',
    fuel_type: 'diesel',
    capacity: 0,
    max_weight: 0,
    tiers: [],
    avg_speed: 50,
    fuel_efficiency: 12,
    max_daily_distance: 400,
    maintenance_frequency_km: 10000,
  },
  
  setStep: (step) => set({ currentStep: step }),
  
  updateDraft: (updates) => set((state) => ({ 
    draft: { ...state.draft, ...updates } 
  })),
  
  reset: () => set({ 
    currentStep: 1, 
    draft: {
      model: '',
      plate_number: '',
      fuel_type: 'diesel',
      capacity: 0,
      max_weight: 0,
      tiers: [],
      avg_speed: 50,
      fuel_efficiency: 12,
      max_daily_distance: 400,
      maintenance_frequency_km: 10000,
    }
  }),
  
  canProceed: (step) => {
    const { draft } = get();
    
    switch (step) {
      case 1:
        return !!(draft.category_id && draft.model && draft.plate_number);
      case 2:
        return !!(draft.capacity && draft.tiers && draft.tiers.length > 0);
      case 3:
        return !!(draft.avg_speed && draft.fuel_efficiency);
      case 4:
        return true;
      default:
        return false;
    }
  },
}));

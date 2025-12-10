/**
 * Vehicle Class Constraints
 * Defines tier count limits based on vehicle classification
 */

export interface VehicleClassConstraint {
  minTiers: number;
  maxTiers: number;
  defaultTiers: number;
  maxSlotsPerTier?: number;
  totalMaxSlots?: number;
}

export const VEHICLE_CLASS_CONSTRAINTS: Record<string, VehicleClassConstraint> = {
  // Motorcycles/Mopeds/Scooters
  L1e: { minTiers: 1, maxTiers: 1, defaultTiers: 1, maxSlotsPerTier: 4, totalMaxSlots: 4 },
  L2e: { minTiers: 1, maxTiers: 1, defaultTiers: 1, maxSlotsPerTier: 4, totalMaxSlots: 4 },
  BIKO_MOPED: { minTiers: 1, maxTiers: 1, defaultTiers: 1, maxSlotsPerTier: 5, totalMaxSlots: 5 },
  BIKO_KEKE: { minTiers: 1, maxTiers: 2, defaultTiers: 1, maxSlotsPerTier: 10, totalMaxSlots: 10 },

  // Sedans/Hatchbacks/SUVs
  M1: { minTiers: 1, maxTiers: 2, defaultTiers: 2, maxSlotsPerTier: 6, totalMaxSlots: 6 },
  BIKO_MINIVAN: { minTiers: 2, maxTiers: 3, defaultTiers: 2, maxSlotsPerTier: 8, totalMaxSlots: 15 },

  // Vans
  M2: { minTiers: 2, maxTiers: 3, defaultTiers: 3, maxSlotsPerTier: 9, totalMaxSlots: 12 },
  N1: { minTiers: 2, maxTiers: 3, defaultTiers: 3, maxSlotsPerTier: 12, totalMaxSlots: 12 },
  BIKO_COLDCHAIN: { minTiers: 2, maxTiers: 3, defaultTiers: 2, maxSlotsPerTier: 10, totalMaxSlots: 15 },

  // Trucks
  N2: { minTiers: 3, maxTiers: 4, defaultTiers: 4, maxSlotsPerTier: 12, totalMaxSlots: 16 },
  N3: { minTiers: 3, maxTiers: 4, defaultTiers: 4, maxSlotsPerTier: 12, totalMaxSlots: 20 },

  // Fallback default
  DEFAULT: { minTiers: 1, maxTiers: 3, defaultTiers: 2, maxSlotsPerTier: 12, totalMaxSlots: 12 },
};

/**
 * Get vehicle class constraints by category code
 */
export function getVehicleClassConstraints(categoryCode: string): VehicleClassConstraint {
  const upperCode = categoryCode?.toUpperCase();
  return VEHICLE_CLASS_CONSTRAINTS[upperCode] || VEHICLE_CLASS_CONSTRAINTS.DEFAULT;
}

/**
 * Check if a tier count is valid for a vehicle class
 */
export function isValidTierCount(categoryCode: string, tierCount: number): boolean {
  const constraints = getVehicleClassConstraints(categoryCode);
  return tierCount >= constraints.minTiers && tierCount <= constraints.maxTiers;
}

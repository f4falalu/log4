/**
 * VLMS Vehicle Onboarding - Tier Validation
 * Validation rules and helpers for tier configurations
 */

import type { TierConfig, TierValidationResult, CapacityConfig } from '@/types/vlms-onboarding';
import { sumTierCapacities, validateTierOrder } from './capacityCalculations';
import { getVehicleClassConstraints } from './vehicleClassConstraints';

// =====================================================
// VALIDATION CONSTANTS
// =====================================================

const TOLERANCE_PERCENTAGE = 5; // Allow 5% over-capacity tolerance
const MIN_TIER_WEIGHT_KG = 10; // Minimum 10kg per tier
const MIN_TIER_VOLUME_M3 = 0.01; // Minimum 0.01m³ per tier
const MAX_TIER_COUNT = 10; // Maximum number of tiers
const MIN_SLOT_COUNT = 1; // Minimum 1 slot per tier
const MAX_SLOT_COUNT = 12; // Maximum 12 slots per tier

// =====================================================
// TIER VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate slot count is within acceptable range
 */
export function validateSlotCount(count: number): { valid: boolean; message: string } {
  if (!Number.isInteger(count)) {
    return { valid: false, message: 'Slot count must be a whole number' };
  }

  if (count < MIN_SLOT_COUNT) {
    return { valid: false, message: `Minimum ${MIN_SLOT_COUNT} slot required per tier` };
  }

  if (count > MAX_SLOT_COUNT) {
    return { valid: false, message: `Maximum ${MAX_SLOT_COUNT} slots allowed per tier` };
  }

  return { valid: true, message: 'Valid slot count' };
}

/**
 * Validate tier count against vehicle class constraints
 */
export function validateTierCountForClass(
  count: number,
  vehicleClass: string
): { valid: boolean; message: string } {
  const constraints = getVehicleClassConstraints(vehicleClass);

  if (count < constraints.minTiers) {
    return {
      valid: false,
      message: `${vehicleClass} vehicles require at least ${constraints.minTiers} tier${constraints.minTiers > 1 ? 's' : ''}`,
    };
  }

  if (count > constraints.maxTiers) {
    return {
      valid: false,
      message: `${vehicleClass} vehicles cannot exceed ${constraints.maxTiers} tier${constraints.maxTiers > 1 ? 's' : ''}`,
    };
  }

  return { valid: true, message: 'Valid tier count' };
}

/**
 * Compute total slots across all tiers
 */
export function computeTotalSlots(tiers: TierConfig[]): number {
  return tiers.reduce((total, tier) => total + (tier.slot_count || 0), 0);
}

/**
 * Validate tier configuration against vehicle capacity and class constraints
 */
export function validateTierConfig(
  tierConfigs: TierConfig[],
  maxCapacityKg?: number,
  maxCapacityM3?: number,
  vehicleClass?: string
): TierValidationResult {
  // Empty tier config is valid
  if (!tierConfigs || tierConfigs.length === 0) {
    return {
      is_valid: true,
      total_weight_kg: 0,
      validation_message: 'No tier configuration provided',
    };
  }

  // Validate tier count against vehicle class if provided
  if (vehicleClass) {
    const tierCountValidation = validateTierCountForClass(tierConfigs.length, vehicleClass);
    if (!tierCountValidation.valid) {
      return {
        is_valid: false,
        total_weight_kg: 0,
        validation_message: tierCountValidation.message,
      };
    }
  }

  // Validate tier count (general)
  if (tierConfigs.length > MAX_TIER_COUNT) {
    return {
      is_valid: false,
      total_weight_kg: 0,
      validation_message: `Maximum ${MAX_TIER_COUNT} tiers allowed`,
    };
  }

  // Validate slot counts
  for (let i = 0; i < tierConfigs.length; i++) {
    const tier = tierConfigs[i];
    if (tier.slot_count !== undefined) {
      const slotValidation = validateSlotCount(tier.slot_count);
      if (!slotValidation.valid) {
        return {
          is_valid: false,
          total_weight_kg: 0,
          validation_message: `Tier ${i + 1} (${tier.tier_name}): ${slotValidation.message}`,
        };
      }
    }
  }

  // Validate total slots against vehicle class constraints
  if (vehicleClass) {
    const constraints = getVehicleClassConstraints(vehicleClass);
    const totalSlots = computeTotalSlots(tierConfigs);
    if (totalSlots > constraints.totalMaxSlots) {
      return {
        is_valid: false,
        total_weight_kg: 0,
        validation_message: `Total slots (${totalSlots}) exceeds maximum allowed (${constraints.totalMaxSlots}) for ${vehicleClass} vehicles`,
      };
    }
  }

  // Validate tier ordering
  if (!validateTierOrder(tierConfigs)) {
    return {
      is_valid: false,
      total_weight_kg: 0,
      validation_message: 'Tier order must be sequential starting from 1',
    };
  }

  // Check for duplicate tier names
  const tierNames = tierConfigs.map((t) => t.tier_name.toLowerCase());
  const uniqueNames = new Set(tierNames);
  if (tierNames.length !== uniqueNames.size) {
    return {
      is_valid: false,
      total_weight_kg: 0,
      validation_message: 'Tier names must be unique',
    };
  }

  // Validate individual tier capacities
  for (const tier of tierConfigs) {
    if (tier.max_weight_kg !== undefined && tier.max_weight_kg < MIN_TIER_WEIGHT_KG) {
      return {
        is_valid: false,
        total_weight_kg: 0,
        validation_message: `Tier "${tier.tier_name}" weight must be at least ${MIN_TIER_WEIGHT_KG}kg`,
      };
    }

    if (tier.max_volume_m3 !== undefined && tier.max_volume_m3 < MIN_TIER_VOLUME_M3) {
      return {
        is_valid: false,
        total_weight_kg: 0,
        validation_message: `Tier "${tier.tier_name}" volume must be at least ${MIN_TIER_VOLUME_M3}m³`,
      };
    }
  }

  // Sum tier capacities
  const { totalWeightKg, totalVolumeM3 } = sumTierCapacities(tierConfigs);

  // Validate weight doesn't exceed capacity (with tolerance)
  if (maxCapacityKg !== undefined) {
    const toleranceKg = maxCapacityKg * (TOLERANCE_PERCENTAGE / 100);
    const maxAllowedKg = maxCapacityKg + toleranceKg;

    if (totalWeightKg > maxAllowedKg) {
      return {
        is_valid: false,
        total_weight_kg: totalWeightKg,
        validation_message: `Tier weights (${totalWeightKg}kg) exceed vehicle capacity (${maxCapacityKg}kg) by more than ${TOLERANCE_PERCENTAGE}%`,
      };
    }

    // Warning if close to capacity
    if (totalWeightKg > maxCapacityKg && totalWeightKg <= maxAllowedKg) {
      return {
        is_valid: true,
        total_weight_kg: totalWeightKg,
        validation_message: `Warning: Tier weights (${totalWeightKg}kg) slightly exceed capacity (${maxCapacityKg}kg) but within ${TOLERANCE_PERCENTAGE}% tolerance`,
      };
    }
  }

  // Validate volume doesn't exceed capacity (with tolerance)
  if (maxCapacityM3 !== undefined) {
    const toleranceM3 = maxCapacityM3 * (TOLERANCE_PERCENTAGE / 100);
    const maxAllowedM3 = maxCapacityM3 + toleranceM3;

    if (totalVolumeM3 > maxAllowedM3) {
      return {
        is_valid: false,
        total_weight_kg: totalWeightKg,
        validation_message: `Tier volumes (${totalVolumeM3}m³) exceed vehicle capacity (${maxCapacityM3}m³) by more than ${TOLERANCE_PERCENTAGE}%`,
      };
    }

    // Warning if close to capacity
    if (totalVolumeM3 > maxCapacityM3 && totalVolumeM3 <= maxAllowedM3) {
      return {
        is_valid: true,
        total_weight_kg: totalWeightKg,
        validation_message: `Warning: Tier volumes (${totalVolumeM3}m³) slightly exceed capacity (${maxCapacityM3}m³) but within ${TOLERANCE_PERCENTAGE}% tolerance`,
      };
    }
  }

  return {
    is_valid: true,
    total_weight_kg: totalWeightKg,
    validation_message: 'Tier configuration is valid',
  };
}

/**
 * Validate capacity configuration
 */
export function validateCapacityConfig(config: CapacityConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate basic capacity values
  if (config.capacity_kg !== undefined && config.capacity_kg <= 0) {
    errors.push('Capacity weight must be greater than zero');
  }

  if (config.capacity_m3 !== undefined && config.capacity_m3 <= 0) {
    errors.push('Capacity volume must be greater than zero');
  }

  // Validate dimensions if using dimensional mode
  if (config.use_dimensions && config.dimensions) {
    const { length_cm, width_cm, height_cm } = config.dimensions;

    if (length_cm <= 0 || width_cm <= 0 || height_cm <= 0) {
      errors.push('All dimensions must be greater than zero');
    }

    // Warn if dimensions seem unrealistic
    if (length_cm > 2000) warnings.push('Length seems unusually large (>20m)');
    if (width_cm > 300) warnings.push('Width seems unusually large (>3m)');
    if (height_cm > 400) warnings.push('Height seems unusually large (>4m)');

    if (length_cm < 50) warnings.push('Length seems unusually small (<50cm)');
    if (width_cm < 30) warnings.push('Width seems unusually small (<30cm)');
    if (height_cm < 30) warnings.push('Height seems unusually small (<30cm)');
  }

  // Validate tier configuration
  if (config.tiered_config && config.tiered_config.length > 0) {
    const tierValidation = validateTierConfig(
      config.tiered_config,
      config.capacity_kg,
      config.capacity_m3
    );

    if (!tierValidation.is_valid) {
      errors.push(tierValidation.validation_message);
    } else if (tierValidation.validation_message.startsWith('Warning:')) {
      warnings.push(tierValidation.validation_message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate tier name
 */
export function validateTierName(
  name: string,
  existingNames: string[]
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Tier name is required' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Tier name must be 50 characters or less' };
  }

  if (existingNames.map((n) => n.toLowerCase()).includes(name.toLowerCase())) {
    return { isValid: false, error: 'Tier name must be unique' };
  }

  return { isValid: true };
}

/**
 * Validate tier weight
 */
export function validateTierWeight(
  weightKg: number,
  maxCapacityKg?: number
): { isValid: boolean; error?: string; warning?: string } {
  if (weightKg < MIN_TIER_WEIGHT_KG) {
    return {
      isValid: false,
      error: `Weight must be at least ${MIN_TIER_WEIGHT_KG}kg`,
    };
  }

  if (maxCapacityKg && weightKg > maxCapacityKg) {
    return {
      isValid: false,
      error: `Weight cannot exceed vehicle capacity (${maxCapacityKg}kg)`,
    };
  }

  if (maxCapacityKg && weightKg > maxCapacityKg * 0.8) {
    return {
      isValid: true,
      warning: 'Single tier uses more than 80% of total capacity',
    };
  }

  return { isValid: true };
}

/**
 * Validate tier volume
 */
export function validateTierVolume(
  volumeM3: number,
  maxCapacityM3?: number
): { isValid: boolean; error?: string; warning?: string } {
  if (volumeM3 < MIN_TIER_VOLUME_M3) {
    return {
      isValid: false,
      error: `Volume must be at least ${MIN_TIER_VOLUME_M3}m³`,
    };
  }

  if (maxCapacityM3 && volumeM3 > maxCapacityM3) {
    return {
      isValid: false,
      error: `Volume cannot exceed vehicle capacity (${maxCapacityM3}m³)`,
    };
  }

  if (maxCapacityM3 && volumeM3 > maxCapacityM3 * 0.8) {
    return {
      isValid: true,
      warning: 'Single tier uses more than 80% of total volume',
    };
  }

  return { isValid: true };
}

// =====================================================
// CAPACITY UTILIZATION HELPERS
// =====================================================

/**
 * Calculate capacity utilization percentage
 */
export function calculateCapacityUtilization(
  tierConfigs: TierConfig[],
  maxCapacityKg?: number,
  maxCapacityM3?: number
): {
  weightUtilization: number;
  volumeUtilization: number;
} {
  const { totalWeightKg, totalVolumeM3 } = sumTierCapacities(tierConfigs);

  const weightUtilization = maxCapacityKg
    ? Math.round((totalWeightKg / maxCapacityKg) * 100)
    : 0;

  const volumeUtilization = maxCapacityM3
    ? Math.round((totalVolumeM3 / maxCapacityM3) * 100)
    : 0;

  return { weightUtilization, volumeUtilization };
}

/**
 * Get utilization status
 */
export function getUtilizationStatus(utilizationPct: number): {
  status: 'low' | 'optimal' | 'high' | 'exceeded';
  color: string;
  message: string;
} {
  if (utilizationPct > 100) {
    return {
      status: 'exceeded',
      color: 'destructive',
      message: 'Capacity exceeded',
    };
  }

  if (utilizationPct > 95) {
    return {
      status: 'high',
      color: 'warning',
      message: 'Near capacity',
    };
  }

  if (utilizationPct >= 70) {
    return {
      status: 'optimal',
      color: 'success',
      message: 'Optimal utilization',
    };
  }

  return {
    status: 'low',
    color: 'muted',
    message: 'Low utilization',
  };
}

/**
 * Check if tier configuration is balanced
 */
export function isTierConfigBalanced(tierConfigs: TierConfig[]): {
  isBalanced: boolean;
  message: string;
} {
  if (tierConfigs.length <= 1) {
    return { isBalanced: true, message: 'Single tier configuration' };
  }

  const { totalWeightKg } = sumTierCapacities(tierConfigs);
  const avgWeightPerTier = totalWeightKg / tierConfigs.length;

  // Check if any tier is more than 50% different from average
  const isBalanced = tierConfigs.every((tier) => {
    const weight = tier.max_weight_kg || 0;
    const deviation = Math.abs(weight - avgWeightPerTier) / avgWeightPerTier;
    return deviation <= 0.5; // Within 50% of average
  });

  return {
    isBalanced,
    message: isBalanced
      ? 'Tier capacities are well balanced'
      : 'Tier capacities vary significantly',
  };
}

// =====================================================
// VALIDATION HELPERS FOR FORMS
// =====================================================

/**
 * Get validation state for form fields
 */
export function getFieldValidationState(
  value: number | undefined,
  validator: (val: number) => { isValid: boolean; error?: string; warning?: string }
): {
  state: 'valid' | 'invalid' | 'warning' | 'empty';
  message?: string;
} {
  if (value === undefined || value === null) {
    return { state: 'empty' };
  }

  const validation = validator(value);

  if (!validation.isValid) {
    return { state: 'invalid', message: validation.error };
  }

  if (validation.warning) {
    return { state: 'warning', message: validation.warning };
  }

  return { state: 'valid' };
}

/**
 * Format validation messages for display
 */
export function formatValidationMessages(
  errors: string[],
  warnings: string[]
): { hasIssues: boolean; summary: string } {
  const hasIssues = errors.length > 0 || warnings.length > 0;

  if (!hasIssues) {
    return { hasIssues: false, summary: 'All validations passed' };
  }

  const parts: string[] = [];

  if (errors.length > 0) {
    parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}`);
  }

  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
  }

  return {
    hasIssues: true,
    summary: parts.join(', '),
  };
}

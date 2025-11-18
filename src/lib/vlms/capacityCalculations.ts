/**
 * VLMS Vehicle Onboarding - Capacity Calculations
 * Utility functions for cargo volume and tier capacity calculations
 */

import type { TierConfig, DimensionalConfig, CapacityConfig } from '@/types/vlms-onboarding';

// =====================================================
// DIMENSIONAL CALCULATIONS
// =====================================================

/**
 * Calculate cargo volume in cubic meters from dimensions in centimeters
 * Formula: (L/100 × W/100 × H/100) = m³
 */
export function calculateVolumeFromDimensions(
  length_cm: number,
  width_cm: number,
  height_cm: number
): number {
  if (length_cm <= 0 || width_cm <= 0 || height_cm <= 0) {
    throw new Error('All dimensions must be greater than zero');
  }

  // Convert cm to meters and calculate volume
  const volumeM3 = (length_cm / 100) * (width_cm / 100) * (height_cm / 100);

  // Round to 2 decimal places
  return Math.round(volumeM3 * 100) / 100;
}

/**
 * Create dimensional config with calculated volume
 */
export function createDimensionalConfig(
  length_cm: number,
  width_cm: number,
  height_cm: number
): DimensionalConfig {
  return {
    length_cm,
    width_cm,
    height_cm,
    calculated_volume_m3: calculateVolumeFromDimensions(length_cm, width_cm, height_cm),
  };
}

/**
 * Estimate dimensions from volume (assumes standard cargo box proportions)
 * Typical ratio: 2:1:1 (length:width:height)
 */
export function estimateDimensionsFromVolume(volume_m3: number): DimensionalConfig {
  if (volume_m3 <= 0) {
    throw new Error('Volume must be greater than zero');
  }

  // Assume 2:1:1 ratio for L:W:H
  // V = 2x * x * x = 2x³
  // x = ∛(V/2)
  const x = Math.cbrt(volume_m3 / 2);

  const length_cm = Math.round(2 * x * 100);
  const width_cm = Math.round(x * 100);
  const height_cm = Math.round(x * 100);

  return createDimensionalConfig(length_cm, width_cm, height_cm);
}

// =====================================================
// TIER CALCULATIONS
// =====================================================

/**
 * Calculate tier capacities from percentages and total capacity
 */
export function calculateTierCapacities(
  tierConfigs: TierConfig[],
  totalCapacityKg: number,
  totalVolumeM3: number
): TierConfig[] {
  return tierConfigs.map((tier) => ({
    ...tier,
    max_weight_kg: tier.weight_pct
      ? Math.round((tier.weight_pct / 100) * totalCapacityKg)
      : tier.max_weight_kg,
    max_volume_m3: tier.volume_pct
      ? Math.round((tier.volume_pct / 100) * totalVolumeM3 * 100) / 100
      : tier.max_volume_m3,
  }));
}

/**
 * Calculate percentage distributions from absolute tier values
 */
export function calculateTierPercentages(
  tierConfigs: TierConfig[],
  totalCapacityKg?: number,
  totalVolumeM3?: number
): TierConfig[] {
  const totalTierWeight = tierConfigs.reduce(
    (sum, tier) => sum + (tier.max_weight_kg || 0),
    0
  );
  const totalTierVolume = tierConfigs.reduce(
    (sum, tier) => sum + (tier.max_volume_m3 || 0),
    0
  );

  return tierConfigs.map((tier) => ({
    ...tier,
    weight_pct:
      totalCapacityKg && tier.max_weight_kg
        ? Math.round((tier.max_weight_kg / totalCapacityKg) * 100)
        : totalTierWeight && tier.max_weight_kg
        ? Math.round((tier.max_weight_kg / totalTierWeight) * 100)
        : undefined,
    volume_pct:
      totalVolumeM3 && tier.max_volume_m3
        ? Math.round((tier.max_volume_m3 / totalVolumeM3) * 100)
        : totalTierVolume && tier.max_volume_m3
        ? Math.round((tier.max_volume_m3 / totalTierVolume) * 100)
        : undefined,
  }));
}

/**
 * Sum total tier capacities
 */
export function sumTierCapacities(tierConfigs: TierConfig[]): {
  totalWeightKg: number;
  totalVolumeM3: number;
} {
  const totalWeightKg = tierConfigs.reduce(
    (sum, tier) => sum + (tier.max_weight_kg || 0),
    0
  );
  const totalVolumeM3 = tierConfigs.reduce(
    (sum, tier) => sum + (tier.max_volume_m3 || 0),
    0
  );

  return {
    totalWeightKg: Math.round(totalWeightKg),
    totalVolumeM3: Math.round(totalVolumeM3 * 100) / 100,
  };
}

/**
 * Validate tier order sequence
 */
export function validateTierOrder(tierConfigs: TierConfig[]): boolean {
  if (tierConfigs.length === 0) return true;

  const orders = tierConfigs.map((t) => t.tier_order).sort((a, b) => a - b);

  // Check for sequential ordering starting from 1
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) return false;
  }

  return true;
}

/**
 * Sort tiers by order
 */
export function sortTiersByOrder(tierConfigs: TierConfig[]): TierConfig[] {
  return [...tierConfigs].sort((a, b) => a.tier_order - b.tier_order);
}

/**
 * Create default tier configuration
 */
export function createDefaultTierConfig(
  tierCount: number,
  totalCapacityKg: number,
  totalVolumeM3: number
): TierConfig[] {
  if (tierCount === 1) {
    return [
      {
        tier_name: 'Cargo',
        tier_order: 1,
        max_weight_kg: totalCapacityKg,
        max_volume_m3: totalVolumeM3,
        weight_pct: 100,
        volume_pct: 100,
      },
    ];
  }

  if (tierCount === 3) {
    // Standard 30-40-30 distribution
    return [
      {
        tier_name: 'Lower',
        tier_order: 1,
        max_weight_kg: Math.round(totalCapacityKg * 0.3),
        max_volume_m3: Math.round(totalVolumeM3 * 0.3 * 100) / 100,
        weight_pct: 30,
        volume_pct: 30,
      },
      {
        tier_name: 'Middle',
        tier_order: 2,
        max_weight_kg: Math.round(totalCapacityKg * 0.4),
        max_volume_m3: Math.round(totalVolumeM3 * 0.4 * 100) / 100,
        weight_pct: 40,
        volume_pct: 40,
      },
      {
        tier_name: 'Upper',
        tier_order: 3,
        max_weight_kg: Math.round(totalCapacityKg * 0.3),
        max_volume_m3: Math.round(totalVolumeM3 * 0.3 * 100) / 100,
        weight_pct: 30,
        volume_pct: 30,
      },
    ];
  }

  // Equal distribution for other tier counts
  const weightPerTier = Math.round(totalCapacityKg / tierCount);
  const volumePerTier = Math.round((totalVolumeM3 / tierCount) * 100) / 100;
  const pctPerTier = Math.round(100 / tierCount);

  return Array.from({ length: tierCount }, (_, i) => ({
    tier_name: `Tier ${i + 1}`,
    tier_order: i + 1,
    max_weight_kg: weightPerTier,
    max_volume_m3: volumePerTier,
    weight_pct: pctPerTier,
    volume_pct: pctPerTier,
  }));
}

// =====================================================
// CAPACITY CONFIG HELPERS
// =====================================================

/**
 * Create capacity config from vehicle type defaults
 */
export function createCapacityConfigFromDefaults(
  defaultCapacityKg?: number,
  defaultCapacityM3?: number,
  defaultTierConfig?: TierConfig[]
): CapacityConfig {
  const capacity_kg = defaultCapacityKg || 1000;
  const capacity_m3 = defaultCapacityM3 || 4.5;

  let tieredConfig = defaultTierConfig || [];

  // If tier config has percentages but no absolute values, calculate them
  if (tieredConfig.length > 0) {
    tieredConfig = calculateTierCapacities(tieredConfig, capacity_kg, capacity_m3);
  }

  return {
    capacity_kg,
    capacity_m3,
    tiered_config: tieredConfig,
    use_dimensions: false,
  };
}

/**
 * Update capacity config with new dimensions
 */
export function updateCapacityWithDimensions(
  config: CapacityConfig,
  dimensions: DimensionalConfig
): CapacityConfig {
  return {
    ...config,
    capacity_m3: dimensions.calculated_volume_m3,
    dimensions,
    use_dimensions: true,
  };
}

/**
 * Update capacity config with manual values
 */
export function updateCapacityManual(
  config: CapacityConfig,
  capacity_kg: number,
  capacity_m3: number
): CapacityConfig {
  return {
    ...config,
    capacity_kg,
    capacity_m3,
    dimensions: undefined,
    use_dimensions: false,
  };
}

/**
 * Recalculate tier capacities when total capacity changes
 */
export function recalculateTierCapacities(
  config: CapacityConfig,
  newCapacityKg?: number,
  newCapacityM3?: number
): CapacityConfig {
  const capacity_kg = newCapacityKg ?? config.capacity_kg ?? 1000;
  const capacity_m3 = newCapacityM3 ?? config.capacity_m3 ?? 4.5;

  const tieredConfig = calculateTierCapacities(
    config.tiered_config,
    capacity_kg,
    capacity_m3
  );

  return {
    ...config,
    capacity_kg,
    capacity_m3,
    tiered_config: tieredConfig,
  };
}

// =====================================================
// FORMAT HELPERS
// =====================================================

/**
 * Format volume with unit
 */
export function formatVolume(volumeM3: number): string {
  return `${volumeM3.toFixed(2)} m³`;
}

/**
 * Format weight with unit
 */
export function formatWeight(weightKg: number): string {
  if (weightKg >= 1000) {
    return `${(weightKg / 1000).toFixed(1)} tons`;
  }
  return `${weightKg} kg`;
}

/**
 * Format dimensions
 */
export function formatDimensions(dimensions: DimensionalConfig): string {
  return `${dimensions.length_cm} × ${dimensions.width_cm} × ${dimensions.height_cm} cm`;
}

/**
 * Format tier summary
 */
export function formatTierSummary(tier: TierConfig): string {
  const parts: string[] = [tier.tier_name];

  if (tier.max_weight_kg) {
    parts.push(formatWeight(tier.max_weight_kg));
  }

  if (tier.max_volume_m3) {
    parts.push(formatVolume(tier.max_volume_m3));
  }

  return parts.join(' • ');
}

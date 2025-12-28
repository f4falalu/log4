/**
 * VLMS Vehicle Onboarding - Capacity Calculations Tests
 * Unit tests for capacity calculation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateVolumeFromDimensions,
  createDimensionalConfig,
  estimateDimensionsFromVolume,
  calculateTierCapacities,
  calculateTierPercentages,
  sumTierCapacities,
  validateTierOrder,
  sortTiersByOrder,
  createDefaultTierConfig,
  formatVolume,
  formatWeight,
} from '../capacityCalculations';
import type { TierConfig } from '@/types/vlms-onboarding';

describe('Capacity Calculations', () => {
  describe('calculateVolumeFromDimensions', () => {
    it('should calculate volume correctly from dimensions in cm', () => {
      const volume = calculateVolumeFromDimensions(400, 200, 180);
      expect(volume).toBe(14.4); // 4m × 2m × 1.8m = 14.4 m³
    });

    it('should round to 2 decimal places', () => {
      const volume = calculateVolumeFromDimensions(333, 222, 111);
      expect(volume).toBeCloseTo(8.18, 2);
    });

    it('should throw error for zero or negative dimensions', () => {
      expect(() => calculateVolumeFromDimensions(0, 200, 180)).toThrow();
      expect(() => calculateVolumeFromDimensions(400, -200, 180)).toThrow();
    });
  });

  describe('createDimensionalConfig', () => {
    it('should create dimensional config with calculated volume', () => {
      const config = createDimensionalConfig(400, 200, 180);
      expect(config.length_cm).toBe(400);
      expect(config.width_cm).toBe(200);
      expect(config.height_cm).toBe(180);
      expect(config.calculated_volume_m3).toBe(14.4);
    });
  });

  describe('estimateDimensionsFromVolume', () => {
    it('should estimate dimensions from volume using 2:1:1 ratio', () => {
      const config = estimateDimensionsFromVolume(14.4);

      // Check that dimensions roughly multiply to the target volume
      const calculatedVolume = (config.length_cm / 100) * (config.width_cm / 100) * (config.height_cm / 100);
      expect(calculatedVolume).toBeCloseTo(14.4, 1);

      // Check ratio is approximately 2:1:1
      expect(config.length_cm).toBeGreaterThan(config.width_cm);
      expect(config.length_cm / config.width_cm).toBeCloseTo(2, 0.1);
    });

    it('should throw error for zero or negative volume', () => {
      expect(() => estimateDimensionsFromVolume(0)).toThrow();
      expect(() => estimateDimensionsFromVolume(-5)).toThrow();
    });
  });

  describe('calculateTierCapacities', () => {
    it('should calculate tier capacities from percentages', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 1, weight_pct: 30, volume_pct: 30 },
        { tier_name: 'Middle', tier_order: 2, weight_pct: 40, volume_pct: 40 },
        { tier_name: 'Upper', tier_order: 3, weight_pct: 30, volume_pct: 30 },
      ];

      const result = calculateTierCapacities(tierConfigs, 1000, 10);

      expect(result[0].max_weight_kg).toBe(300);
      expect(result[0].max_volume_m3).toBe(3);
      expect(result[1].max_weight_kg).toBe(400);
      expect(result[1].max_volume_m3).toBe(4);
      expect(result[2].max_weight_kg).toBe(300);
      expect(result[2].max_volume_m3).toBe(3);
    });

    it('should preserve existing absolute values if no percentages', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Cargo', tier_order: 1, max_weight_kg: 500, max_volume_m3: 5 },
      ];

      const result = calculateTierCapacities(tierConfigs, 1000, 10);

      expect(result[0].max_weight_kg).toBe(500);
      expect(result[0].max_volume_m3).toBe(5);
    });
  });

  describe('calculateTierPercentages', () => {
    it('should calculate percentages from absolute values', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 1, max_weight_kg: 300, max_volume_m3: 3 },
        { tier_name: 'Middle', tier_order: 2, max_weight_kg: 400, max_volume_m3: 4 },
        { tier_name: 'Upper', tier_order: 3, max_weight_kg: 300, max_volume_m3: 3 },
      ];

      const result = calculateTierPercentages(tierConfigs, 1000, 10);

      expect(result[0].weight_pct).toBe(30);
      expect(result[0].volume_pct).toBe(30);
      expect(result[1].weight_pct).toBe(40);
      expect(result[1].volume_pct).toBe(40);
      expect(result[2].weight_pct).toBe(30);
      expect(result[2].volume_pct).toBe(30);
    });
  });

  describe('sumTierCapacities', () => {
    it('should sum total weight and volume from tiers', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 1, max_weight_kg: 300, max_volume_m3: 3 },
        { tier_name: 'Upper', tier_order: 2, max_weight_kg: 400, max_volume_m3: 4 },
      ];

      const result = sumTierCapacities(tierConfigs);

      expect(result.totalWeightKg).toBe(700);
      expect(result.totalVolumeM3).toBe(7);
    });

    it('should handle empty tier configs', () => {
      const result = sumTierCapacities([]);

      expect(result.totalWeightKg).toBe(0);
      expect(result.totalVolumeM3).toBe(0);
    });
  });

  describe('validateTierOrder', () => {
    it('should validate correct sequential order starting from 1', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 1 },
        { tier_name: 'Middle', tier_order: 2 },
        { tier_name: 'Upper', tier_order: 3 },
      ];

      expect(validateTierOrder(tierConfigs)).toBe(true);
    });

    it('should return false for non-sequential order', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 1 },
        { tier_name: 'Upper', tier_order: 3 }, // Missing 2
      ];

      expect(validateTierOrder(tierConfigs)).toBe(false);
    });

    it('should return false if not starting from 1', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Lower', tier_order: 2 },
        { tier_name: 'Upper', tier_order: 3 },
      ];

      expect(validateTierOrder(tierConfigs)).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(validateTierOrder([])).toBe(true);
    });
  });

  describe('sortTiersByOrder', () => {
    it('should sort tiers by tier_order ascending', () => {
      const tierConfigs: TierConfig[] = [
        { tier_name: 'Upper', tier_order: 3 },
        { tier_name: 'Lower', tier_order: 1 },
        { tier_name: 'Middle', tier_order: 2 },
      ];

      const result = sortTiersByOrder(tierConfigs);

      expect(result[0].tier_name).toBe('Lower');
      expect(result[1].tier_name).toBe('Middle');
      expect(result[2].tier_name).toBe('Upper');
    });

    it('should not mutate original array', () => {
      const original: TierConfig[] = [
        { tier_name: 'Upper', tier_order: 3 },
        { tier_name: 'Lower', tier_order: 1 },
      ];

      sortTiersByOrder(original);

      expect(original[0].tier_name).toBe('Upper');
    });
  });

  describe('createDefaultTierConfig', () => {
    it('should create single tier config for tier count 1', () => {
      const result = createDefaultTierConfig(1, 1000, 10);

      expect(result).toHaveLength(1);
      expect(result[0].tier_name).toBe('Cargo');
      expect(result[0].max_weight_kg).toBe(1000);
      expect(result[0].max_volume_m3).toBe(10);
      expect(result[0].weight_pct).toBe(100);
    });

    it('should create 3-tier config with 30-40-30 distribution', () => {
      const result = createDefaultTierConfig(3, 1000, 10);

      expect(result).toHaveLength(3);
      expect(result[0].tier_name).toBe('Lower');
      expect(result[0].weight_pct).toBe(30);
      expect(result[1].tier_name).toBe('Middle');
      expect(result[1].weight_pct).toBe(40);
      expect(result[2].tier_name).toBe('Upper');
      expect(result[2].weight_pct).toBe(30);
    });

    it('should create equal distribution for other tier counts', () => {
      const result = createDefaultTierConfig(4, 1000, 10);

      expect(result).toHaveLength(4);
      expect(result.every(t => t.max_weight_kg === 250)).toBe(true);
      expect(result.every(t => t.max_volume_m3 === 2.5)).toBe(true);
    });
  });

  describe('formatVolume', () => {
    it('should format volume with m³ unit', () => {
      expect(formatVolume(10.5)).toBe('10.50 m³');
      expect(formatVolume(0.25)).toBe('0.25 m³');
    });
  });

  describe('formatWeight', () => {
    it('should format weight in kg for values < 1000', () => {
      expect(formatWeight(500)).toBe('500 kg');
      expect(formatWeight(999)).toBe('999 kg');
    });

    it('should format weight in tons for values >= 1000', () => {
      expect(formatWeight(1000)).toBe('1.0 tons');
      expect(formatWeight(3500)).toBe('3.5 tons');
    });
  });
});

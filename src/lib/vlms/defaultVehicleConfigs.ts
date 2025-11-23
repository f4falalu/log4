/**
 * Default Vehicle Configurations
 * Pre-populated dimensions and specs for each vehicle category
 */

interface DefaultVehicleConfig {
  dimensions: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  payload: {
    gross_weight_kg: number;
    max_payload_kg: number;
  };
  tiers: Array<{
    name: string;
    slots: number;
    tier_level: number;
  }>;
}

export const DEFAULT_VEHICLE_CONFIGS: Record<string, DefaultVehicleConfig> = {
  // EU Categories
  M1: {
    dimensions: { length_cm: 450, width_cm: 180, height_cm: 145 },
    payload: { gross_weight_kg: 2000, max_payload_kg: 500 },
    tiers: [],
  },
  M2: {
    dimensions: { length_cm: 520, width_cm: 190, height_cm: 200 },
    payload: { gross_weight_kg: 3500, max_payload_kg: 800 },
    tiers: [],
  },
  N1: {
    dimensions: { length_cm: 550, width_cm: 200, height_cm: 210 },
    payload: { gross_weight_kg: 3500, max_payload_kg: 1200 },
    tiers: [
      { name: 'Upper Tier', slots: 20, tier_level: 1 },
      { name: 'Lower Tier', slots: 20, tier_level: 2 },
    ],
  },
  N2: {
    dimensions: { length_cm: 750, width_cm: 250, height_cm: 280 },
    payload: { gross_weight_kg: 12000, max_payload_kg: 5000 },
    tiers: [
      { name: 'Upper Tier', slots: 40, tier_level: 1 },
      { name: 'Middle Tier', slots: 40, tier_level: 2 },
      { name: 'Lower Tier', slots: 40, tier_level: 3 },
    ],
  },
  N3: {
    dimensions: { length_cm: 1350, width_cm: 255, height_cm: 300 },
    payload: { gross_weight_kg: 40000, max_payload_kg: 25000 },
    tiers: [
      { name: 'Upper Tier', slots: 60, tier_level: 1 },
      { name: 'Middle Tier', slots: 60, tier_level: 2 },
      { name: 'Lower Tier', slots: 60, tier_level: 3 },
    ],
  },
  L1: {
    dimensions: { length_cm: 180, width_cm: 70, height_cm: 110 },
    payload: { gross_weight_kg: 250, max_payload_kg: 100 },
    tiers: [{ name: 'Cargo Basket', slots: 5, tier_level: 1 }],
  },
  L2: {
    dimensions: { length_cm: 220, width_cm: 80, height_cm: 120 },
    payload: { gross_weight_kg: 400, max_payload_kg: 150 },
    tiers: [{ name: 'Rear Cargo', slots: 8, tier_level: 1 }],
  },

  // BIKO Shortcuts
  BIKO_MINIVAN: {
    dimensions: { length_cm: 520, width_cm: 190, height_cm: 200 },
    payload: { gross_weight_kg: 3500, max_payload_kg: 900 },
    tiers: [
      { name: 'Upper Tier', slots: 15, tier_level: 1 },
      { name: 'Lower Tier', slots: 15, tier_level: 2 },
    ],
  },
  BIKO_KEKE: {
    dimensions: { length_cm: 280, width_cm: 130, height_cm: 180 },
    payload: { gross_weight_kg: 600, max_payload_kg: 300 },
    tiers: [{ name: 'Cargo Area', slots: 10, tier_level: 1 }],
  },
  BIKO_MOPED: {
    dimensions: { length_cm: 180, width_cm: 70, height_cm: 110 },
    payload: { gross_weight_kg: 250, max_payload_kg: 100 },
    tiers: [{ name: 'Front Basket', slots: 5, tier_level: 1 }],
  },
  BIKO_COLDCHAIN: {
    dimensions: { length_cm: 550, width_cm: 200, height_cm: 220 },
    payload: { gross_weight_kg: 3500, max_payload_kg: 1000 },
    tiers: [
      { name: 'Refrigerated Upper', slots: 15, tier_level: 1 },
      { name: 'Refrigerated Lower', slots: 15, tier_level: 2 },
    ],
  },
};

export function getDefaultConfig(categoryCode: string): DefaultVehicleConfig | null {
  return DEFAULT_VEHICLE_CONFIGS[categoryCode] || null;
}

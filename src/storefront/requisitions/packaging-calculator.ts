/**
 * =====================================================
 * PACKAGING CALCULATOR
 * =====================================================
 *
 * Computes packaging for requisitions.
 *
 * IMPORTANT:
 *   - Packaging is computed ONCE at approval
 *   - Packaging is IMMUTABLE after computation
 *   - No recalculation allowed after initial computation
 */

import type {
  Requisition,
  RequisitionItem,
  RequisitionPackaging,
  RequisitionPackagingItem,
  PackagingType,
  PackagingSlotCost,
} from '@/types/requisitions';
import type { PackagingComputationResult } from './types';

/**
 * Default packaging slot costs.
 * These should come from database in production.
 */
const DEFAULT_SLOT_COSTS: Record<PackagingType, { slot_cost: number; max_weight_kg: number; max_volume_m3: number }> = {
  bag_s: { slot_cost: 0.25, max_weight_kg: 2, max_volume_m3: 0.01 },
  box_m: { slot_cost: 0.5, max_weight_kg: 10, max_volume_m3: 0.05 },
  box_l: { slot_cost: 1, max_weight_kg: 25, max_volume_m3: 0.1 },
  crate_xl: { slot_cost: 2, max_weight_kg: 50, max_volume_m3: 0.25 },
};

/**
 * Compute packaging for a requisition.
 * This should only be called ONCE after approval.
 */
export function computePackaging(
  requisition: Requisition,
  computedBy: string,
  slotCosts: PackagingSlotCost[] = []
): PackagingComputationResult {
  // Check if packaging already exists
  if (requisition.packaging?.is_final) {
    return {
      success: false,
      error: 'Packaging already computed and finalized. Recalculation not allowed.',
    };
  }

  // Validate requisition has items
  if (!requisition.items || requisition.items.length === 0) {
    return {
      success: false,
      error: 'Requisition has no items to package',
    };
  }

  // Build slot cost lookup
  const slotCostMap = new Map<PackagingType, PackagingSlotCost>();
  for (const cost of slotCosts) {
    if (cost.is_active) {
      slotCostMap.set(cost.packaging_type, cost);
    }
  }

  // Compute packaging for each item
  const packagingItems: RequisitionPackagingItem[] = [];
  let totalSlotDemand = 0;
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;

  for (const item of requisition.items) {
    const result = computeItemPackaging(item, slotCostMap);

    packagingItems.push({
      id: generateId(),
      requisition_packaging_id: '', // Will be set when packaging is created
      requisition_item_id: item.id,
      packaging_type: result.packaging_type,
      package_count: result.package_count,
      slot_cost: result.slot_cost_per_package,
      slot_demand: result.total_slot_demand,
      item_name: item.item_name,
      quantity: item.quantity,
      weight_kg: item.weight_kg,
      volume_m3: item.volume_m3,
      created_at: new Date().toISOString(),
    });

    totalSlotDemand += result.total_slot_demand;
    totalWeightKg += (item.weight_kg || 0) * item.quantity;
    totalVolumeM3 += (item.volume_m3 || 0) * item.quantity;
  }

  // Round up slot demand to nearest integer
  const roundedSlotDemand = Math.ceil(totalSlotDemand);

  return {
    success: true,
    packaging: {
      total_slot_demand: totalSlotDemand,
      rounded_slot_demand: roundedSlotDemand,
      total_weight_kg: totalWeightKg,
      total_volume_m3: totalVolumeM3,
      item_count: requisition.items.length,
    },
  };
}

/**
 * Create packaging record for requisition.
 */
export function createPackagingRecord(
  requisitionId: string,
  items: RequisitionItem[],
  computedBy: string,
  slotCosts: PackagingSlotCost[] = []
): RequisitionPackaging | null {
  const slotCostMap = new Map<PackagingType, PackagingSlotCost>();
  for (const cost of slotCosts) {
    if (cost.is_active) {
      slotCostMap.set(cost.packaging_type, cost);
    }
  }

  const packagingItems: RequisitionPackagingItem[] = [];
  let totalSlotDemand = 0;
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;

  const packagingId = generateId();

  for (const item of items) {
    const result = computeItemPackaging(item, slotCostMap);

    packagingItems.push({
      id: generateId(),
      requisition_packaging_id: packagingId,
      requisition_item_id: item.id,
      packaging_type: result.packaging_type,
      package_count: result.package_count,
      slot_cost: result.slot_cost_per_package,
      slot_demand: result.total_slot_demand,
      item_name: item.item_name,
      quantity: item.quantity,
      weight_kg: item.weight_kg,
      volume_m3: item.volume_m3,
      created_at: new Date().toISOString(),
    });

    totalSlotDemand += result.total_slot_demand;
    totalWeightKg += (item.weight_kg || 0) * item.quantity;
    totalVolumeM3 += (item.volume_m3 || 0) * item.quantity;
  }

  const now = new Date().toISOString();

  return {
    id: packagingId,
    requisition_id: requisitionId,
    total_slot_demand: totalSlotDemand,
    rounded_slot_demand: Math.ceil(totalSlotDemand),
    packaging_version: 1,
    computed_at: now,
    computed_by: computedBy,
    is_final: true, // Packaging is finalized immediately
    total_weight_kg: totalWeightKg,
    total_volume_m3: totalVolumeM3,
    total_items: items.length,
    created_at: now,
    items: packagingItems,
  };
}

/**
 * Compute packaging for a single item.
 */
function computeItemPackaging(
  item: RequisitionItem,
  slotCostMap: Map<PackagingType, PackagingSlotCost>
): {
  packaging_type: PackagingType;
  package_count: number;
  slot_cost_per_package: number;
  total_slot_demand: number;
} {
  const itemWeight = (item.weight_kg || 0) * item.quantity;
  const itemVolume = (item.volume_m3 || 0) * item.quantity;

  // Determine best packaging type based on weight/volume
  const packagingType = selectPackagingType(itemWeight, itemVolume, slotCostMap);

  // Get slot cost
  const slotCost = slotCostMap.get(packagingType);
  const slotCostPerPackage = slotCost?.slot_cost || DEFAULT_SLOT_COSTS[packagingType].slot_cost;

  // Calculate package count based on capacity
  const maxWeight = slotCost?.max_weight_kg || DEFAULT_SLOT_COSTS[packagingType].max_weight_kg;
  const maxVolume = slotCost?.max_volume_m3 || DEFAULT_SLOT_COSTS[packagingType].max_volume_m3;

  const packagesByWeight = Math.ceil(itemWeight / maxWeight);
  const packagesByVolume = Math.ceil(itemVolume / maxVolume);
  const packageCount = Math.max(packagesByWeight, packagesByVolume, 1);

  return {
    packaging_type: packagingType,
    package_count: packageCount,
    slot_cost_per_package: slotCostPerPackage,
    total_slot_demand: packageCount * slotCostPerPackage,
  };
}

/**
 * Select best packaging type for item.
 */
function selectPackagingType(
  weight: number,
  volume: number,
  slotCostMap: Map<PackagingType, PackagingSlotCost>
): PackagingType {
  // Order by size (smallest first)
  const types: PackagingType[] = ['bag_s', 'box_m', 'box_l', 'crate_xl'];

  for (const type of types) {
    const costs = slotCostMap.get(type) || {
      max_weight_kg: DEFAULT_SLOT_COSTS[type].max_weight_kg,
      max_volume_m3: DEFAULT_SLOT_COSTS[type].max_volume_m3,
    };

    const maxWeight = costs.max_weight_kg || DEFAULT_SLOT_COSTS[type].max_weight_kg;
    const maxVolume = costs.max_volume_m3 || DEFAULT_SLOT_COSTS[type].max_volume_m3;

    // If item fits in this packaging type, use it
    if (weight <= maxWeight && volume <= maxVolume) {
      return type;
    }
  }

  // Default to largest if nothing fits
  return 'crate_xl';
}

/**
 * Generate unique ID.
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Check if packaging can be modified.
 * Answer is always NO after initial computation.
 */
export function canModifyPackaging(packaging: RequisitionPackaging): boolean {
  // Packaging is IMMUTABLE after creation
  return false;
}

/**
 * Assert packaging is immutable.
 * Throws if modification is attempted.
 */
export function assertPackagingImmutable(packaging: RequisitionPackaging): void {
  if (packaging.is_final) {
    throw new PackagingImmutableError(
      `Packaging ${packaging.id} is finalized and cannot be modified`
    );
  }
}

/**
 * Error class for packaging immutability violations.
 */
export class PackagingImmutableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackagingImmutableError';
  }
}

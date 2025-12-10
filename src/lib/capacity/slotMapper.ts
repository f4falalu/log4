/**
 * Slot Mapper - Vehicle Slot Map Generator
 * Generates slot-level capacity maps from vehicle tier configurations
 */

import type { TierConfig } from '@/types/vlms-onboarding';

// =====================================================
// TYPES
// =====================================================

export interface VehicleSlot {
  slot_key: string; // "VEH123-Lower-1"
  vehicle_id: string;
  tier_name: string;
  tier_order: number;
  slot_number: number;
  slot_index: number; // Global slot index across all tiers
  capacity_kg: number;
  capacity_m3: number;
  occupied: boolean;
  assigned_facility_id: string | null;
  assigned_batch_id: string | null;
}

export interface SlotAssignment {
  slot_key: string;
  vehicle_id: string;
  tier_name: string;
  slot_number: number;
  facility_id: string;
  load_kg?: number;
  load_volume_m3?: number;
  sequence_order?: number;
}

export interface Vehicle {
  id: string;
  license_plate?: string;
  capacity_kg?: number;
  capacity_m3?: number;
  tiered_config?: any; // JSONB with tiers array
}

// =====================================================
// SLOT MAP GENERATOR
// =====================================================

/**
 * Generate complete slot map for a vehicle
 */
export function generateVehicleSlotMap(
  vehicle: Vehicle,
  existingAssignments: SlotAssignment[] = []
): VehicleSlot[] {
  if (!vehicle.tiered_config || !vehicle.tiered_config.tiers) {
    return [];
  }

  const tiers = vehicle.tiered_config.tiers as TierConfig[];
  const totalCapacityKg = vehicle.capacity_kg || 0;
  const totalCapacityM3 = vehicle.capacity_m3 || 0;

  // Calculate total slots
  const totalSlots = tiers.reduce((sum, tier) => sum + (tier.slot_count || 0), 0);

  // Calculate per-slot capacity (evenly distributed)
  const capacityPerSlotKg = totalSlots > 0 ? totalCapacityKg / totalSlots : 0;
  const capacityPerSlotM3 = totalSlots > 0 ? totalCapacityM3 / totalSlots : 0;

  const slots: VehicleSlot[] = [];
  let globalSlotIndex = 0;

  // Generate slots for each tier
  for (const tier of tiers) {
    const slotCount = tier.slot_count || 0;

    for (let i = 1; i <= slotCount; i++) {
      const slotKey = `${vehicle.id}-${tier.tier_name}-${i}`;

      // Check if this slot is occupied
      const assignment = existingAssignments.find(a => a.slot_key === slotKey);

      slots.push({
        slot_key: slotKey,
        vehicle_id: vehicle.id,
        tier_name: tier.tier_name,
        tier_order: tier.tier_order,
        slot_number: i,
        slot_index: globalSlotIndex,
        capacity_kg: Math.round(capacityPerSlotKg * 100) / 100,
        capacity_m3: Math.round(capacityPerSlotM3 * 1000) / 1000,
        occupied: !!assignment,
        assigned_facility_id: assignment?.facility_id || null,
        assigned_batch_id: assignment?.vehicle_id || null, // Reusing vehicle_id field for batch_id
      });

      globalSlotIndex++;
    }
  }

  return slots;
}

/**
 * Get available (unoccupied) slots
 */
export function getAvailableSlots(
  vehicle: Vehicle,
  existingAssignments: SlotAssignment[] = []
): VehicleSlot[] {
  const allSlots = generateVehicleSlotMap(vehicle, existingAssignments);
  return allSlots.filter(slot => !slot.occupied);
}

/**
 * Get occupied slots
 */
export function getOccupiedSlots(
  vehicle: Vehicle,
  existingAssignments: SlotAssignment[] = []
): VehicleSlot[] {
  const allSlots = generateVehicleSlotMap(vehicle, existingAssignments);
  return allSlots.filter(slot => slot.occupied);
}

/**
 * Get slots by tier
 */
export function getSlotsByTier(
  vehicle: Vehicle,
  tierName: string,
  existingAssignments: SlotAssignment[] = []
): VehicleSlot[] {
  const allSlots = generateVehicleSlotMap(vehicle, existingAssignments);
  return allSlots.filter(slot => slot.tier_name === tierName);
}

/**
 * Get slot utilization statistics
 */
export function getSlotUtilization(
  vehicle: Vehicle,
  existingAssignments: SlotAssignment[] = []
): {
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  utilizationPct: number;
  tierUtilization: Record<string, { total: number; occupied: number; pct: number }>;
} {
  const allSlots = generateVehicleSlotMap(vehicle, existingAssignments);
  const totalSlots = allSlots.length;
  const occupiedSlots = allSlots.filter(s => s.occupied).length;
  const availableSlots = totalSlots - occupiedSlots;
  const utilizationPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // Calculate per-tier utilization
  const tierUtilization: Record<string, { total: number; occupied: number; pct: number }> = {};

  const tierNames = [...new Set(allSlots.map(s => s.tier_name))];
  for (const tierName of tierNames) {
    const tierSlots = allSlots.filter(s => s.tier_name === tierName);
    const tierOccupied = tierSlots.filter(s => s.occupied).length;
    const tierTotal = tierSlots.length;
    const tierPct = tierTotal > 0 ? Math.round((tierOccupied / tierTotal) * 100) : 0;

    tierUtilization[tierName] = {
      total: tierTotal,
      occupied: tierOccupied,
      pct: tierPct,
    };
  }

  return {
    totalSlots,
    occupiedSlots,
    availableSlots,
    utilizationPct,
    tierUtilization,
  };
}

// =====================================================
// VALIDATION
// =====================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate that a facility can fit in a slot
 */
export function validateSlotAssignment(
  facility: { id: string; estimated_weight?: number; estimated_volume?: number },
  slot: VehicleSlot
): ValidationResult {
  if (slot.occupied) {
    return {
      valid: false,
      error: `Slot ${slot.slot_key} is already occupied`,
    };
  }

  const warnings: string[] = [];

  // Check weight capacity
  if (facility.estimated_weight && facility.estimated_weight > slot.capacity_kg) {
    return {
      valid: false,
      error: `Facility weight (${facility.estimated_weight}kg) exceeds slot capacity (${slot.capacity_kg}kg)`,
    };
  }

  // Check volume capacity
  if (facility.estimated_volume && facility.estimated_volume > slot.capacity_m3) {
    return {
      valid: false,
      error: `Facility volume (${facility.estimated_volume}m³) exceeds slot capacity (${slot.capacity_m3}m³)`,
    };
  }

  // Warning if close to capacity
  if (facility.estimated_weight && facility.estimated_weight > slot.capacity_kg * 0.9) {
    warnings.push(`Facility uses >90% of slot weight capacity`);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate batch can fit in vehicle
 */
export function validateBatchCapacity(
  vehicle: Vehicle,
  facilities: Array<{ id: string; estimated_weight?: number; estimated_volume?: number }>,
  existingAssignments: SlotAssignment[] = []
): ValidationResult {
  const availableSlots = getAvailableSlots(vehicle, existingAssignments);

  if (facilities.length > availableSlots.length) {
    return {
      valid: false,
      error: `Batch requires ${facilities.length} slots but only ${availableSlots.length} available`,
    };
  }

  const totalWeight = facilities.reduce((sum, f) => sum + (f.estimated_weight || 0), 0);
  const totalVolume = facilities.reduce((sum, f) => sum + (f.estimated_volume || 0), 0);

  const vehicleCapacityKg = vehicle.capacity_kg || 0;
  const vehicleCapacityM3 = vehicle.capacity_m3 || 0;

  if (totalWeight > vehicleCapacityKg) {
    return {
      valid: false,
      error: `Batch weight (${totalWeight}kg) exceeds vehicle capacity (${vehicleCapacityKg}kg)`,
    };
  }

  if (totalVolume > vehicleCapacityM3) {
    return {
      valid: false,
      error: `Batch volume (${totalVolume}m³) exceeds vehicle capacity (${vehicleCapacityM3}m³)`,
    };
  }

  const warnings: string[] = [];

  if (totalWeight > vehicleCapacityKg * 0.95) {
    warnings.push(`Batch uses >95% of vehicle weight capacity`);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Find conflicting slot assignments
 */
export function findSlotConflicts(assignments: SlotAssignment[]): Array<{
  slot_key: string;
  conflict: string;
  facility_ids: string[];
}> {
  const conflicts: Array<{ slot_key: string; conflict: string; facility_ids: string[] }> = [];
  const slotMap = new Map<string, string[]>();

  // Group assignments by slot_key
  for (const assignment of assignments) {
    const facilities = slotMap.get(assignment.slot_key) || [];
    facilities.push(assignment.facility_id);
    slotMap.set(assignment.slot_key, facilities);
  }

  // Find slots with multiple facilities
  for (const [slotKey, facilityIds] of slotMap.entries()) {
    if (facilityIds.length > 1) {
      conflicts.push({
        slot_key: slotKey,
        conflict: `${facilityIds.length} facilities assigned to same slot`,
        facility_ids: facilityIds,
      });
    }
  }

  return conflicts;
}

// =====================================================
// SLOT KEY UTILITIES
// =====================================================

/**
 * Parse slot key into components
 */
export function parseSlotKey(slotKey: string): {
  vehicleId: string;
  tierName: string;
  slotNumber: number;
} | null {
  const parts = slotKey.split('-');
  if (parts.length < 3) {
    return null;
  }

  const vehicleId = parts[0];
  const slotNumber = parseInt(parts[parts.length - 1]);
  const tierName = parts.slice(1, -1).join('-');

  if (isNaN(slotNumber)) {
    return null;
  }

  return {
    vehicleId,
    tierName,
    slotNumber,
  };
}

/**
 * Generate slot key from components
 */
export function generateSlotKey(vehicleId: string, tierName: string, slotNumber: number): string {
  return `${vehicleId}-${tierName}-${slotNumber}`;
}

/**
 * Get tier name from slot key
 */
export function getTierNameFromSlotKey(slotKey: string): string | null {
  const parsed = parseSlotKey(slotKey);
  return parsed ? parsed.tierName : null;
}

/**
 * Get vehicle ID from slot key
 */
export function getVehicleIdFromSlotKey(slotKey: string): string | null {
  const parsed = parseSlotKey(slotKey);
  return parsed ? parsed.vehicleId : null;
}

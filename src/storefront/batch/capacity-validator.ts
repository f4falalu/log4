/**
 * =====================================================
 * BATCH CAPACITY VALIDATOR
 * =====================================================
 *
 * Validates that a batch can fit within vehicle capacity.
 * Uses READ-ONLY slot snapshot from batch.
 *
 * MUST NOT:
 *   - Modify batch data
 *   - Modify slot assignments
 *   - Access vehicle internals beyond capacity
 *   - Provide "proceed anyway" fallbacks
 */

import type {
  StorefrontBatch,
  BatchCapacityValidation,
} from './types';

/**
 * Vehicle capacity info for validation.
 * This is a minimal interface - we don't access vehicle internals.
 */
export interface VehicleCapacityInfo {
  vehicle_id: string;
  total_slots: number;
  capacity_kg: number;
  capacity_m3: number;
}

/**
 * Validate batch fits within vehicle capacity.
 * Returns validation result with explicit errors/warnings.
 *
 * IMPORTANT: This is a blocking validator.
 * If validation fails, the batch cannot proceed.
 */
export function validateBatchCapacity(
  batch: StorefrontBatch,
  vehicleCapacity: VehicleCapacityInfo
): BatchCapacityValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { slot_snapshot } = batch;

  // Validate slot count
  if (slot_snapshot.total_slot_demand > vehicleCapacity.total_slots) {
    errors.push(
      `Batch requires ${slot_snapshot.total_slot_demand} slots but vehicle has ${vehicleCapacity.total_slots}`
    );
  }

  // Validate weight capacity
  const totalWeight = slot_snapshot.facility_demands.reduce(
    (sum, fd) => sum + (fd.weight_kg || 0),
    0
  );

  if (totalWeight > vehicleCapacity.capacity_kg) {
    errors.push(
      `Batch weight (${totalWeight}kg) exceeds vehicle capacity (${vehicleCapacity.capacity_kg}kg)`
    );
  }

  // Validate volume capacity
  const totalVolume = slot_snapshot.facility_demands.reduce(
    (sum, fd) => sum + (fd.volume_m3 || 0),
    0
  );

  if (totalVolume > vehicleCapacity.capacity_m3) {
    errors.push(
      `Batch volume (${totalVolume}m³) exceeds vehicle capacity (${vehicleCapacity.capacity_m3}m³)`
    );
  }

  // Warnings for near-capacity
  const slotUtilization = slot_snapshot.total_slot_demand / vehicleCapacity.total_slots;
  if (slotUtilization > 0.9 && slotUtilization <= 1.0) {
    warnings.push(
      `Batch uses ${Math.round(slotUtilization * 100)}% of vehicle slot capacity`
    );
  }

  const weightUtilization = totalWeight / vehicleCapacity.capacity_kg;
  if (weightUtilization > 0.9 && weightUtilization <= 1.0) {
    warnings.push(
      `Batch uses ${Math.round(weightUtilization * 100)}% of vehicle weight capacity`
    );
  }

  return {
    valid: errors.length === 0,
    total_slot_demand: slot_snapshot.total_slot_demand,
    total_weight_kg: totalWeight,
    total_volume_m3: totalVolume,
    errors,
    warnings,
  };
}

/**
 * Check if batch can be assigned to a vehicle.
 * Throws if validation fails (no silent fallbacks).
 */
export function assertBatchFitsVehicle(
  batch: StorefrontBatch,
  vehicleCapacity: VehicleCapacityInfo
): void {
  const validation = validateBatchCapacity(batch, vehicleCapacity);

  if (!validation.valid) {
    throw new BatchCapacityError(
      `Batch ${batch.batch_id} cannot fit in vehicle ${vehicleCapacity.vehicle_id}`,
      validation.errors
    );
  }
}

/**
 * Find compatible vehicles for a batch.
 * Returns vehicles that pass capacity validation.
 */
export function findCompatibleVehicles(
  batch: StorefrontBatch,
  availableVehicles: VehicleCapacityInfo[]
): VehicleCapacityInfo[] {
  return availableVehicles.filter((vehicle) => {
    const validation = validateBatchCapacity(batch, vehicle);
    return validation.valid;
  });
}

/**
 * Rank vehicles by fitness for a batch.
 * Prefers 70-90% utilization.
 */
export function rankVehiclesByFitness(
  batch: StorefrontBatch,
  compatibleVehicles: VehicleCapacityInfo[]
): Array<{ vehicle: VehicleCapacityInfo; score: number; utilization: number }> {
  const { slot_snapshot } = batch;

  return compatibleVehicles
    .map((vehicle) => {
      const utilization = slot_snapshot.total_slot_demand / vehicle.total_slots;
      // Optimal utilization is 80%
      const score = 100 - Math.abs(utilization - 0.8) * 100;

      return {
        vehicle,
        score: Math.round(score),
        utilization: Math.round(utilization * 100),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Error class for batch capacity validation failures.
 */
export class BatchCapacityError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message);
    this.name = 'BatchCapacityError';
    this.validationErrors = validationErrors;
  }
}

/**
 * =====================================================
 * PAYLOAD VALIDATOR
 * =====================================================
 *
 * Validates payload items against vehicle capacity.
 * SINGLE SOURCE OF TRUTH for payload validation.
 *
 * MUST NOT:
 *   - Provide "proceed anyway" fallbacks
 *   - Allow silent overflow
 *   - Modify payload data
 */

import type {
  VehicleCapacity,
  PayloadValidationResult,
} from './types';
import { getSlotUtilization } from './slot-mapper';

/**
 * Payload item for validation.
 */
export interface PayloadItem {
  id?: string;
  name: string;
  quantity: number;
  weight_kg: number;
  volume_m3: number;
  temperature_required?: boolean;
  handling_instructions?: string;
}

/**
 * Validate payload against vehicle capacity.
 * Returns explicit errors if validation fails.
 */
export function validatePayload(
  items: PayloadItem[],
  vehicle: VehicleCapacity
): PayloadValidationResult {
  const totalWeight = items.reduce(
    (sum, item) => sum + item.weight_kg * item.quantity,
    0
  );
  const totalVolume = items.reduce(
    (sum, item) => sum + item.volume_m3 * item.quantity,
    0
  );

  const weightUtilization = vehicle.capacity_kg > 0
    ? (totalWeight / vehicle.capacity_kg) * 100
    : 0;
  const volumeUtilization = vehicle.capacity_m3 > 0
    ? (totalVolume / vehicle.capacity_m3) * 100
    : 0;

  // Get slot utilization
  const slotUtil = getSlotUtilization(vehicle);
  const slotUtilization = slotUtil.utilizationPct;

  const overloadErrors: string[] = [];
  const warnings: string[] = [];

  // Weight validation
  if (totalWeight > vehicle.capacity_kg) {
    overloadErrors.push(
      `Weight exceeds capacity by ${(totalWeight - vehicle.capacity_kg).toFixed(1)} kg`
    );
  }

  // Volume validation
  if (totalVolume > vehicle.capacity_m3) {
    overloadErrors.push(
      `Volume exceeds capacity by ${(totalVolume - vehicle.capacity_m3).toFixed(2)} m³`
    );
  }

  // Near-capacity warnings (not errors)
  if (weightUtilization > 90 && weightUtilization <= 100) {
    warnings.push(`Weight at ${Math.round(weightUtilization)}% capacity`);
  }

  if (volumeUtilization > 90 && volumeUtilization <= 100) {
    warnings.push(`Volume at ${Math.round(volumeUtilization)}% capacity`);
  }

  return {
    isValid: overloadErrors.length === 0,
    totalWeight,
    totalVolume,
    weightUtilization: Math.round(weightUtilization * 10) / 10,
    volumeUtilization: Math.round(volumeUtilization * 10) / 10,
    slotUtilization,
    overloadErrors,
    warnings,
  };
}

/**
 * Assert payload fits vehicle.
 * Throws if validation fails (no silent fallbacks).
 */
export function assertPayloadFitsVehicle(
  items: PayloadItem[],
  vehicle: VehicleCapacity
): void {
  const validation = validatePayload(items, vehicle);

  if (!validation.isValid) {
    throw new PayloadValidationError(
      `Payload cannot fit in vehicle ${vehicle.vehicle_id}`,
      validation.overloadErrors
    );
  }
}

/**
 * Suggest best vehicle for payload.
 * Returns vehicle with optimal utilization (70-90%).
 */
export function suggestVehicleForPayload(
  items: PayloadItem[],
  availableVehicles: VehicleCapacity[]
): VehicleCapacity | null {
  const totalWeight = items.reduce(
    (sum, item) => sum + item.weight_kg * item.quantity,
    0
  );
  const totalVolume = items.reduce(
    (sum, item) => sum + item.volume_m3 * item.quantity,
    0
  );

  // Filter vehicles that can handle the payload
  const suitableVehicles = availableVehicles.filter(
    (v) => v.capacity_kg >= totalWeight && v.capacity_m3 >= totalVolume
  );

  if (suitableVehicles.length === 0) return null;

  // Find vehicle with best utilization (closest to 80%)
  return suitableVehicles.reduce((best, current) => {
    const bestUtil = Math.max(
      totalWeight / best.capacity_kg,
      totalVolume / best.capacity_m3
    );
    const currentUtil = Math.max(
      totalWeight / current.capacity_kg,
      totalVolume / current.capacity_m3
    );

    // Prefer 70-90% utilization (target 80%)
    const bestScore = Math.abs(0.8 - bestUtil);
    const currentScore = Math.abs(0.8 - currentUtil);

    return currentScore < bestScore ? current : best;
  });
}

/**
 * Calculate overall payload utilization.
 * Returns the higher of weight/volume utilization (limiting factor).
 */
export function calculatePayloadUtilization(
  totalWeight: number,
  totalVolume: number,
  vehicle: VehicleCapacity
): number {
  const weightUtil = vehicle.capacity_kg > 0
    ? (totalWeight / vehicle.capacity_kg) * 100
    : 0;
  const volumeUtil = vehicle.capacity_m3 > 0
    ? (totalVolume / vehicle.capacity_m3) * 100
    : 0;

  // Return the higher utilization (limiting factor)
  return Math.max(weightUtil, volumeUtil);
}

/**
 * Error class for payload validation failures.
 */
export class PayloadValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message);
    this.name = 'PayloadValidationError';
    this.validationErrors = validationErrors;
  }
}

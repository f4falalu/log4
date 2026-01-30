/**
 * =====================================================
 * VEHICLE ASSIGNER
 * =====================================================
 *
 * Assigns vehicles to batches.
 * Uses capacity validation from payload module.
 */

import type {
  VehicleAssignment,
  VehicleAssignmentRequest,
  ExecutablePlan,
  OptimizedRoute,
} from './types';
import type { VehicleCapacity } from '@/fleetops/payload';
import type { BatchHandoffContract } from '@/storefront/batch';

/**
 * Assign vehicle to batch.
 * Validates capacity before assignment.
 */
export function assignVehicleToBatch(
  request: VehicleAssignmentRequest,
  vehicle: VehicleCapacity
): VehicleAssignment | { error: string } {
  // Validate slot capacity
  if (request.slot_demand > vehicle.total_slots) {
    return {
      error: `Batch requires ${request.slot_demand} slots but vehicle has ${vehicle.total_slots}`,
    };
  }

  // Validate weight capacity
  if (request.total_weight_kg && request.total_weight_kg > vehicle.capacity_kg) {
    return {
      error: `Batch weight (${request.total_weight_kg}kg) exceeds vehicle capacity (${vehicle.capacity_kg}kg)`,
    };
  }

  // Validate volume capacity
  if (request.total_volume_m3 && request.total_volume_m3 > vehicle.capacity_m3) {
    return {
      error: `Batch volume (${request.total_volume_m3}m³) exceeds vehicle capacity (${vehicle.capacity_m3}m³)`,
    };
  }

  // Calculate utilization
  const slotUtilization = (request.slot_demand / vehicle.total_slots) * 100;
  const weightUtilization = request.total_weight_kg
    ? (request.total_weight_kg / vehicle.capacity_kg) * 100
    : 0;
  const volumeUtilization = request.total_volume_m3
    ? (request.total_volume_m3 / vehicle.capacity_m3) * 100
    : 0;

  return {
    batch_id: request.batch_id,
    vehicle_id: request.vehicle_id,
    driver_id: request.driver_id,
    assigned_at: new Date().toISOString(),
    slot_utilization_pct: Math.round(slotUtilization),
    weight_utilization_pct: Math.round(weightUtilization),
    volume_utilization_pct: Math.round(volumeUtilization),
  };
}

/**
 * Find best vehicle for batch.
 * Prefers vehicles with 70-90% utilization.
 */
export function findBestVehicleForBatch(
  slotDemand: number,
  totalWeightKg: number,
  totalVolumeM3: number,
  availableVehicles: VehicleCapacity[]
): VehicleCapacity | null {
  // Filter vehicles that can handle the batch
  const suitableVehicles = availableVehicles.filter((v) => {
    return (
      v.total_slots >= slotDemand &&
      v.capacity_kg >= totalWeightKg &&
      v.capacity_m3 >= totalVolumeM3
    );
  });

  if (suitableVehicles.length === 0) {
    return null;
  }

  // Score vehicles by utilization (target 80%)
  const scored = suitableVehicles.map((vehicle) => {
    const slotUtil = slotDemand / vehicle.total_slots;
    const weightUtil = totalWeightKg / vehicle.capacity_kg;
    const volumeUtil = totalVolumeM3 / vehicle.capacity_m3;

    // Combined utilization (weighted average)
    const avgUtil = (slotUtil * 0.4 + weightUtil * 0.4 + volumeUtil * 0.2);

    // Score: prefer 80% utilization
    const score = 100 - Math.abs(avgUtil - 0.8) * 100;

    return { vehicle, score };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  return scored[0].vehicle;
}

/**
 * Create executable plan from batch, route, and vehicle assignment.
 */
export function createExecutablePlan(
  batch: BatchHandoffContract,
  route: OptimizedRoute,
  vehicleAssignment: VehicleAssignment
): ExecutablePlan {
  return {
    plan_id: generatePlanId(),
    batch_id: batch.batch_id,
    route,
    vehicle_assignment: vehicleAssignment,
    slot_snapshot: batch.slot_snapshot,
    facilities: batch.facilities,
    created_at: new Date().toISOString(),
    status: 'ready',
  };
}

/**
 * Validate executable plan.
 */
export function validateExecutablePlan(plan: ExecutablePlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate route covers all facilities
  const routeFacilities = new Set(plan.route.points.map((p) => p.facility_id));
  const missingInRoute = plan.facilities.filter((f) => !routeFacilities.has(f));

  if (missingInRoute.length > 0) {
    errors.push(`Route missing facilities: ${missingInRoute.join(', ')}`);
  }

  // Validate vehicle assignment
  if (!plan.vehicle_assignment.vehicle_id) {
    errors.push('No vehicle assigned');
  }

  // Validate slot utilization doesn't exceed 100%
  if (plan.vehicle_assignment.slot_utilization_pct > 100) {
    errors.push(`Slot utilization exceeds 100% (${plan.vehicle_assignment.slot_utilization_pct}%)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate plan ID.
 */
function generatePlanId(): string {
  return `PLAN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

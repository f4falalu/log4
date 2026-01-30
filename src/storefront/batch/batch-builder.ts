/**
 * =====================================================
 * BATCH BUILDER
 * =====================================================
 *
 * Handles facility grouping into batches.
 * Derives slot demand from requisition packaging (READ-ONLY).
 *
 * MUST NOT:
 *   - Access vehicle data
 *   - Modify slot assignments
 *   - Recalculate packaging
 */

import type {
  StorefrontBatch,
  CreateBatchRequest,
  BatchSlotSnapshot,
  FacilitySlotDemand,
} from './types';
import type { RequisitionPackaging } from '@/types/requisitions';

/**
 * Build a batch from requisitions.
 * Slot demand is derived from requisition packaging, not calculated here.
 */
export function buildBatchFromRequisitions(
  request: CreateBatchRequest,
  packagingData: Map<string, RequisitionPackaging>
): StorefrontBatch {
  const now = new Date().toISOString();

  // Derive slot demand from packaging (READ-ONLY)
  const facilityDemands: FacilitySlotDemand[] = [];
  const slotDemandPerFacility: Record<string, number> = {};

  for (const facilityId of request.facility_ids) {
    // Find packaging for this facility's requisitions
    let totalSlotDemand = 0;
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;

    for (const [reqId, packaging] of packagingData.entries()) {
      // Only include packaging from this request's requisitions
      if (request.requisition_ids.includes(reqId)) {
        totalSlotDemand += packaging.rounded_slot_demand;
        totalWeightKg += packaging.total_weight_kg || 0;
        totalVolumeM3 += packaging.total_volume_m3 || 0;
      }
    }

    facilityDemands.push({
      facility_id: facilityId,
      slot_demand: totalSlotDemand,
      weight_kg: totalWeightKg,
      volume_m3: totalVolumeM3,
    });

    slotDemandPerFacility[facilityId] = totalSlotDemand;
  }

  // Create frozen slot snapshot
  const slotSnapshot: BatchSlotSnapshot = {
    total_slot_demand: facilityDemands.reduce((sum, fd) => sum + fd.slot_demand, 0),
    facility_demands: facilityDemands,
    computed_at: now,
    version: 1,
  };

  return {
    batch_id: generateBatchId(),
    route_id: undefined,
    facilities: request.facility_ids,
    slot_demand_per_facility: slotDemandPerFacility,
    slot_snapshot: slotSnapshot,
    warehouse_id: request.warehouse_id,
    planned_date: request.planned_date,
    status: 'draft',
    priority: request.priority || 'medium',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Finalize a batch for FleetOps handoff.
 * After finalization, the batch is immutable.
 */
export function finalizeBatch(batch: StorefrontBatch): StorefrontBatch {
  if (batch.status === 'finalized' || batch.status === 'published') {
    throw new Error('Batch is already finalized');
  }

  if (batch.status === 'cancelled') {
    throw new Error('Cannot finalize cancelled batch');
  }

  return {
    ...batch,
    status: 'finalized',
    finalized_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if a batch can be modified.
 */
export function isBatchMutable(batch: StorefrontBatch): boolean {
  return batch.status === 'draft' || batch.status === 'ready';
}

/**
 * Add facilities to a draft batch.
 * Re-derives slot demands from packaging.
 */
export function addFacilitiesToBatch(
  batch: StorefrontBatch,
  facilityIds: string[],
  packagingData: Map<string, RequisitionPackaging>
): StorefrontBatch {
  if (!isBatchMutable(batch)) {
    throw new Error('Cannot modify finalized batch');
  }

  const newFacilityIds = [
    ...batch.facilities,
    ...facilityIds.filter((id) => !batch.facilities.includes(id)),
  ];

  // Re-derive slot demands
  const facilityDemands: FacilitySlotDemand[] = [];
  const slotDemandPerFacility: Record<string, number> = {};

  for (const facilityId of newFacilityIds) {
    let totalSlotDemand = batch.slot_demand_per_facility[facilityId] || 0;

    // Add new facility demands from packaging
    if (facilityIds.includes(facilityId)) {
      for (const [, packaging] of packagingData.entries()) {
        totalSlotDemand += packaging.rounded_slot_demand;
      }
    }

    facilityDemands.push({
      facility_id: facilityId,
      slot_demand: totalSlotDemand,
    });

    slotDemandPerFacility[facilityId] = totalSlotDemand;
  }

  const slotSnapshot: BatchSlotSnapshot = {
    total_slot_demand: facilityDemands.reduce((sum, fd) => sum + fd.slot_demand, 0),
    facility_demands: facilityDemands,
    computed_at: new Date().toISOString(),
    version: batch.slot_snapshot.version + 1,
  };

  return {
    ...batch,
    facilities: newFacilityIds,
    slot_demand_per_facility: slotDemandPerFacility,
    slot_snapshot: slotSnapshot,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Remove facilities from a draft batch.
 */
export function removeFacilitiesFromBatch(
  batch: StorefrontBatch,
  facilityIds: string[]
): StorefrontBatch {
  if (!isBatchMutable(batch)) {
    throw new Error('Cannot modify finalized batch');
  }

  const remainingFacilities = batch.facilities.filter(
    (id) => !facilityIds.includes(id)
  );

  const slotDemandPerFacility: Record<string, number> = {};
  const facilityDemands: FacilitySlotDemand[] = [];

  for (const facilityId of remainingFacilities) {
    const demand = batch.slot_demand_per_facility[facilityId] || 0;
    slotDemandPerFacility[facilityId] = demand;
    facilityDemands.push({
      facility_id: facilityId,
      slot_demand: demand,
    });
  }

  const slotSnapshot: BatchSlotSnapshot = {
    total_slot_demand: facilityDemands.reduce((sum, fd) => sum + fd.slot_demand, 0),
    facility_demands: facilityDemands,
    computed_at: new Date().toISOString(),
    version: batch.slot_snapshot.version + 1,
  };

  return {
    ...batch,
    facilities: remainingFacilities,
    slot_demand_per_facility: slotDemandPerFacility,
    slot_snapshot: slotSnapshot,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate a unique batch ID.
 */
function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `BATCH-${timestamp}-${randomPart}`.toUpperCase();
}

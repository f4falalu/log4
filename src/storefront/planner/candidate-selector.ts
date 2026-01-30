/**
 * =====================================================
 * CANDIDATE SELECTOR
 * =====================================================
 *
 * Selects facility candidates for batching.
 * Only facilities with READY_FOR_DISPATCH requisitions are included.
 */

import type { Requisition } from '@/types/requisitions';
import type {
  BatchCandidate,
  CandidateSelectionCriteria,
  FacilityReadiness,
} from './types';
import { getFacilityReadiness, filterReadyRequisitions } from './readiness-validator';

/**
 * Facility location info (minimal interface).
 */
interface FacilityLocation {
  id: string;
  name: string;
  warehouse_id: string;
  lat?: number;
  lng?: number;
}

/**
 * Select batch candidates based on criteria.
 * Only includes facilities with ready requisitions.
 */
export function selectBatchCandidates(
  requisitions: Requisition[],
  facilities: FacilityLocation[],
  criteria: CandidateSelectionCriteria = {}
): BatchCandidate[] {
  // Filter to only ready requisitions
  const readyRequisitions = filterReadyRequisitions(requisitions);

  if (readyRequisitions.length === 0) {
    return [];
  }

  // Group by facility
  const requisitionsByFacility = groupByFacility(readyRequisitions);

  // Build candidates
  const candidates: BatchCandidate[] = [];

  for (const [facilityId, facilityRequisitions] of requisitionsByFacility.entries()) {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) continue;

    // Apply warehouse filter
    if (criteria.warehouse_id && facility.warehouse_id !== criteria.warehouse_id) {
      continue;
    }

    // Calculate total slot demand
    const totalSlotDemand = facilityRequisitions.reduce(
      (sum, r) => sum + (r.packaging?.rounded_slot_demand || 0),
      0
    );

    // Determine priority (highest among requisitions)
    const priority = getHighestPriority(facilityRequisitions);

    // Apply priority filter
    if (criteria.min_priority && !isPriorityAtLeast(priority, criteria.min_priority)) {
      continue;
    }

    // Apply date filter
    if (criteria.date_range) {
      const hasMatchingDate = facilityRequisitions.some((r) => {
        const date = r.requested_delivery_date;
        return date >= criteria.date_range!.from && date <= criteria.date_range!.to;
      });
      if (!hasMatchingDate) continue;
    }

    candidates.push({
      facility_id: facilityId,
      facility_name: facility.name,
      warehouse_id: facility.warehouse_id,
      requisition_ids: facilityRequisitions.map((r) => r.id),
      total_slot_demand: totalSlotDemand,
      priority,
      requested_date: facilityRequisitions[0]?.requested_delivery_date,
      location: facility.lat && facility.lng
        ? { lat: facility.lat, lng: facility.lng }
        : undefined,
    });
  }

  // Sort by priority (urgent first) then by slot demand (larger first)
  candidates.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.total_slot_demand - a.total_slot_demand;
  });

  // Apply max candidates limit
  if (criteria.max_candidates && candidates.length > criteria.max_candidates) {
    return candidates.slice(0, criteria.max_candidates);
  }

  return candidates;
}

/**
 * Get facility readiness summary for all facilities.
 */
export function getFacilitiesReadinessSummary(
  requisitions: Requisition[],
  facilities: FacilityLocation[]
): FacilityReadiness[] {
  const summaries: FacilityReadiness[] = [];

  for (const facility of facilities) {
    const facilityRequisitions = requisitions.filter(
      (r) => r.facility_id === facility.id
    );

    if (facilityRequisitions.length > 0) {
      summaries.push(
        getFacilityReadiness(facility.id, facility.name, facilityRequisitions)
      );
    }
  }

  // Sort by readiness status (ready first)
  summaries.sort((a, b) => {
    const statusOrder = {
      ready_for_dispatch: 0,
      pending_packaging: 1,
      pending_approval: 2,
      not_ready: 3,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return summaries;
}

/**
 * Group ready candidates by zone for geographic batching.
 */
export function groupCandidatesByProximity(
  candidates: BatchCandidate[],
  maxDistanceKm: number = 20
): BatchCandidate[][] {
  if (candidates.length === 0) return [];

  const groups: BatchCandidate[][] = [];
  const used = new Set<string>();

  for (const candidate of candidates) {
    if (used.has(candidate.facility_id)) continue;
    if (!candidate.location) {
      // No location - create single-facility group
      groups.push([candidate]);
      used.add(candidate.facility_id);
      continue;
    }

    // Start new group
    const group: BatchCandidate[] = [candidate];
    used.add(candidate.facility_id);

    // Find nearby candidates
    for (const other of candidates) {
      if (used.has(other.facility_id)) continue;
      if (!other.location) continue;

      const distance = calculateDistance(
        candidate.location.lat,
        candidate.location.lng,
        other.location.lat,
        other.location.lng
      );

      if (distance <= maxDistanceKm) {
        group.push(other);
        used.add(other.facility_id);
      }
    }

    groups.push(group);
  }

  return groups;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function groupByFacility(requisitions: Requisition[]): Map<string, Requisition[]> {
  const groups = new Map<string, Requisition[]>();

  for (const req of requisitions) {
    const existing = groups.get(req.facility_id) || [];
    existing.push(req);
    groups.set(req.facility_id, existing);
  }

  return groups;
}

function getHighestPriority(
  requisitions: Requisition[]
): 'low' | 'medium' | 'high' | 'urgent' {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  let highest: 'low' | 'medium' | 'high' | 'urgent' = 'low';

  for (const req of requisitions) {
    if (priorityOrder[req.priority] < priorityOrder[highest]) {
      highest = req.priority;
    }
  }

  return highest;
}

function isPriorityAtLeast(
  priority: 'low' | 'medium' | 'high' | 'urgent',
  minPriority: 'low' | 'medium' | 'high' | 'urgent'
): boolean {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return priorityOrder[priority] <= priorityOrder[minPriority];
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

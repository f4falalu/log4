import { EventExecutionService } from './EventExecutionService';
import { GeoLocation, DeliveryItem, ProofOfDelivery } from './events';

/**
 * Calculates distance between two coordinates in meters (Haversine formula)
 */
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates reconciliation rules (PRD 7.1 & 7.3)
 */
function validateReconciliation(items: DeliveryItem[]): void {
  for (const item of items) {
    if (item.delivered_qty !== item.expected_qty && !item.discrepancy_reason) {
      throw new Error(`Discrepancy reason required for item ${item.item_id}`);
    }
  }
}

export async function finalizeDelivery(
  service: EventExecutionService,
  tripId: string,
  dispatchId: string,
  currentGeo: GeoLocation,
  expectedGeo: GeoLocation,
  items: DeliveryItem[],
  pod: ProofOfDelivery,
  facilityRadiusMeters: number = 100,
  proxyJustification?: string
) {
  // 1. Validate Reconciliation (Section 7.1)
  // Delivery cannot finalize without reconciliation
  validateReconciliation(items);

  // 2. Check for Proxy Delivery (Section 8.2)
  const distance = getDistanceFromLatLonInM(
    currentGeo.lat, currentGeo.lng,
    expectedGeo.lat, expectedGeo.lng
  );

  if (distance > facilityRadiusMeters) {
    if (!proxyJustification) {
      // Caller must catch this, prompt user, and retry with justification
      throw new Error('PROXY_DELIVERY_DETECTED: Justification required');
    }
    
    // Emit justification event immediately
    await service.captureEvent(
      'proxy_delivery_reason_recorded',
      tripId,
      dispatchId,
      currentGeo,
      { reason: proxyJustification, distance_m: distance }
    );
  }

  // 3. Emit Completion Event (Section 7.3)
  await service.captureEvent(
    'delivery_completed',
    tripId,
    dispatchId,
    currentGeo,
    { 
      distance_from_target: distance,
      items,
      pod
    }
  );
}
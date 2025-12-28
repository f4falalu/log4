/**
 * mod4 - Mobile Execution Service
 * Event Contract Definitions
 * Based on PRD Section 6.2 & 7
 */

export type EventType =
  | 'delivery_completed'
  | 'delivery_discrepancy'
  | 'location_captured'
  | 'proxy_delivery_reason_recorded'
  | 'recipient_signature_captured'
  | 'new_device_login';

export interface GeoLocation {
  lat: number;
  lng: number;
}

/**
 * Section 7.1: Line-Item Reconciliation
 */
export interface DeliveryItem {
  item_id: string;
  expected_qty: number;
  delivered_qty: number;
  discrepancy_reason?: string; // Mandatory if expected != delivered
}

/**
 * Section 7.2: Recipient Confirmation
 */
export interface ProofOfDelivery {
  recipient_name: string;
  recipient_role: string;
  signature_data: string; // Base64 or file path
}

/**
 * Canonical Event Schema
 * Section 6.2: Immutable, Additive, Idempotent
 */
export interface Mod4Event {
  event_id: string;       // UUID
  event_type: EventType;
  driver_id: string;      // UUID
  trip_id: string;        // UUID
  dispatch_id: string;    // UUID
  vehicle_id: string;     // UUID
  device_id: string;      // UUID
  timestamp: string;      // ISO8601 - Captured at source
  geo: GeoLocation;       // Best-effort GPS
  metadata: Record<string, any>;
}

/**
 * Local storage wrapper for offline support
 */
export interface LocalEventEnvelope extends Mod4Event {
  synced: boolean;
  retry_count: number;
}
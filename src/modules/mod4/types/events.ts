/**
 * Mod4 - Mobile Execution Service
 * Event Contract Definitions
 * Adapted from archived code for Supabase integration
 */

export type Mod4EventType =
  // Session lifecycle
  | 'session_started'
  | 'session_ended'
  | 'heartbeat'

  // Delivery execution
  | 'delivery_started'
  | 'delivery_completed'
  | 'delivery_discrepancy'
  | 'delivery_cancelled'

  // Proof of delivery
  | 'photo_captured'
  | 'signature_captured'
  | 'recipient_confirmed'

  // Location events
  | 'location_captured'
  | 'proxy_delivery_detected'
  | 'proxy_delivery_reason_recorded'

  // Device & auth
  | 'new_device_login';

export interface GeoLocation {
  lat: number;
  lng: number;
}

/**
 * Line-Item Reconciliation
 */
export interface DeliveryItem {
  item_id: string;
  expected_qty: number;
  delivered_qty: number;
  discrepancy_reason?: string; // Mandatory if expected != delivered
}

/**
 * Recipient Confirmation
 */
export interface ProofOfDelivery {
  recipient_name: string;
  recipient_role: string;
  signature_data: string; // Base64 or cloud storage URL
  photo_url?: string; // Cloud storage URL
}

/**
 * Canonical Event Schema
 * Matches mod4_events table structure
 */
export interface Mod4Event {
  event_id: string;       // UUID
  event_type: Mod4EventType;
  driver_id: string;      // UUID - references drivers.id
  session_id: string;     // UUID - references driver_sessions.id
  trip_id?: string;       // UUID - optional trip reference
  batch_id?: string;      // UUID - references delivery_batches.id
  facility_id?: string;   // UUID - references facilities.id
  vehicle_id?: string;    // UUID - references vehicles.id
  device_id: string;      // Device identifier
  timestamp: string;      // ISO8601 - Captured at source
  geo: GeoLocation;       // Best-effort GPS
  metadata: Record<string, any>;
}

/**
 * Local storage wrapper for offline support
 * Used in IndexedDB before sync to Supabase
 */
export interface LocalEventEnvelope extends Mod4Event {
  synced: boolean;
  retry_count: number;
  encrypted?: boolean;
  cipher_text?: string;
  iv?: string;
}

/**
 * GPS Event for continuous tracking
 * Matches driver_gps_events table structure
 */
export interface GPSEvent {
  id?: string;
  driver_id: string;
  session_id: string;
  device_id: string;
  lat: number;
  lng: number;
  altitude_m?: number;
  accuracy_m?: number;
  heading?: number;
  speed_mps?: number;
  captured_at: string; // ISO8601
  battery_level?: number;
  network_type?: string;
  is_moving?: boolean;
}

/**
 * Driver Session
 * Matches driver_sessions table structure
 */
export interface DriverSession {
  id: string;
  driver_id: string;
  device_id: string;
  vehicle_id?: string;
  started_at: string;
  ended_at?: string;
  last_heartbeat_at: string;
  status: 'active' | 'idle' | 'ended' | 'expired';
  device_model?: string;
  os_version?: string;
  app_version?: string;
  battery_level?: number;
  network_type?: string;
}

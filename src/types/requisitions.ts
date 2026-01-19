/**
 * =====================================================
 * Requisition Types
 * =====================================================
 * RFC-012: Extended requisition state machine for proper domain separation.
 *
 * State flow:
 * pending → approved → packaged → ready_for_dispatch → assigned_to_batch → in_transit → fulfilled/failed
 */

// RFC-012: Extended status enum with new states
export type RequisitionStatus =
  | 'pending'            // Initial submission, awaiting approval
  | 'approved'           // Approved by warehouse officer
  | 'packaged'           // Packaging computed (system-only, auto after approved)
  | 'ready_for_dispatch' // Ready for FleetOps to pick up
  | 'assigned_to_batch'  // Assigned to a delivery batch
  | 'in_transit'         // Batch is dispatched, delivery in progress
  | 'fulfilled'          // Delivered successfully
  | 'partially_delivered'// Some items delivered, variance recorded
  | 'failed'             // Delivery failed
  | 'rejected'           // Rejected by warehouse officer
  | 'cancelled';         // Cancelled before dispatch

export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Requisition {
  id: string;
  requisition_number: string;
  facility_id: string;
  warehouse_id: string;
  requested_by: string;
  approved_by?: string;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  requested_delivery_date: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  fulfilled_at?: string;
  // RFC-012: New timestamp fields for state tracking
  packaged_at?: string;
  ready_for_dispatch_at?: string;
  assigned_to_batch_at?: string;
  in_transit_at?: string;
  delivered_at?: string;
  // RFC-012: Batch assignment reference
  batch_id?: string;
  facility?: {
    id: string;
    name: string;
    address: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  items?: RequisitionItem[];
  // RFC-012: Packaging reference
  packaging?: RequisitionPackaging;
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  volume_m3?: number;
  temperature_required: boolean;
  handling_instructions?: string;
  created_at: string;
}

export interface CreateRequisitionData {
  facility_id: string;
  warehouse_id: string;
  priority: RequisitionPriority;
  requested_delivery_date: string;
  notes?: string;
  items: Omit<RequisitionItem, 'id' | 'requisition_id' | 'created_at'>[];
}

// Handoff types
export interface HandoffWithVehicles {
  id: string;
  from_vehicle_id: string;
  to_vehicle_id: string;
  from_batch_id: string;
  location_lat: number;
  location_lng: number;
  scheduled_time?: string;
  actual_time?: string;
  status: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  from_vehicle?: {
    id: string;
    model: string;
    plate_number: string;
  };
  to_vehicle?: {
    id: string;
    model: string;
    plate_number: string;
  };
}

// Batch types
export interface BatchWithVehicle {
  id: string;
  name: string;
  status: string;
  priority: string;
  scheduled_date: string;
  scheduled_time: string;
  total_distance: number;
  total_quantity: number;
  payload_utilization_pct?: number;
  vehicle?: {
    id: string;
    model: string;
    plate_number: string;
  };
  driver?: {
    id: string;
    name: string;
  };
}

// Zone alert types
export interface ZoneAlert {
  id: string;
  zone_id: string;
  driver_id: string;
  event_type: string;
  timestamp: string;
  location_lat: number;
  location_lng: number;
  acknowledged: boolean;
  notes?: string;
}

// Payload types
export interface PayloadItem {
  id: string;
  name: string;
  batch_id: string;
  quantity: number;
  weight_kg: number;
  volume_m3: number;
  temperature_required: boolean;
  handling_instructions?: string;
  created_at: string;
}

// Vehicle types
export interface VehicleWithCapacity {
  id: string;
  type: string;
  model: string;
  plate_number: string;
  capacity: number;
  capacity_volume_m3?: number;
  capacity_weight_kg?: number;
  max_weight: number;
  fuel_type: string;
  status: string;
  photo_url?: string;
  thumbnail_url?: string;
  ai_generated: boolean;
}

// =====================================================
// RFC-012: Packaging Types
// =====================================================
// Packaging is computed once at approval and is immutable.
// Slot demand is derived from packaging rules, not volume math.

export type PackagingType = 'bag_s' | 'box_m' | 'box_l' | 'crate_xl';

export interface PackagingSlotCost {
  id: string;
  packaging_type: PackagingType;
  slot_cost: number;
  max_weight_kg?: number;
  max_volume_m3?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequisitionPackaging {
  id: string;
  requisition_id: string;
  total_slot_demand: number;
  rounded_slot_demand: number;
  packaging_version: number;
  computed_at: string;
  computed_by: string;
  is_final: boolean;
  total_weight_kg?: number;
  total_volume_m3?: number;
  total_items?: number;
  created_at: string;
  items?: RequisitionPackagingItem[];
}

export interface RequisitionPackagingItem {
  id: string;
  requisition_packaging_id: string;
  requisition_item_id: string;
  packaging_type: PackagingType;
  package_count: number;
  slot_cost: number;
  slot_demand: number;
  item_name: string;
  quantity: number;
  weight_kg?: number;
  volume_m3?: number;
  created_at: string;
}

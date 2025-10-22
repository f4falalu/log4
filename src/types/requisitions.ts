// Requisition types
export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
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

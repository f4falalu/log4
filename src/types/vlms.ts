/**
 * VLMS (Vehicle Lifecycle Management System) Type Definitions
 * Comprehensive TypeScript types for all VLMS entities
 */

import { Database } from '@/integrations/supabase/types';

// =====================================================
// Database Types (from Supabase)
// =====================================================

export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export type MaintenanceRecord = Database['public']['Tables']['vlms_maintenance_records']['Row'];
export type MaintenanceRecordInsert = Database['public']['Tables']['vlms_maintenance_records']['Insert'];
export type MaintenanceRecordUpdate = Database['public']['Tables']['vlms_maintenance_records']['Update'];

export type FuelLog = Database['public']['Tables']['vlms_fuel_logs']['Row'];
export type FuelLogInsert = Database['public']['Tables']['vlms_fuel_logs']['Insert'];
export type FuelLogUpdate = Database['public']['Tables']['vlms_fuel_logs']['Update'];

export type Assignment = Database['public']['Tables']['vlms_assignments']['Row'];
export type AssignmentInsert = Database['public']['Tables']['vlms_assignments']['Insert'];
export type AssignmentUpdate = Database['public']['Tables']['vlms_assignments']['Update'];

export type Incident = Database['public']['Tables']['vlms_incidents']['Row'];
export type IncidentInsert = Database['public']['Tables']['vlms_incidents']['Insert'];
export type IncidentUpdate = Database['public']['Tables']['vlms_incidents']['Update'];

export type Inspection = Database['public']['Tables']['vlms_inspections']['Row'];
export type InspectionInsert = Database['public']['Tables']['vlms_inspections']['Insert'];
export type InspectionUpdate = Database['public']['Tables']['vlms_inspections']['Update'];

export type DisposalRecord = Database['public']['Tables']['vlms_disposal_records']['Row'];
export type DisposalRecordInsert = Database['public']['Tables']['vlms_disposal_records']['Insert'];
export type DisposalRecordUpdate = Database['public']['Tables']['vlms_disposal_records']['Update'];

// =====================================================
// Enum Types
// =====================================================

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'disposed';

export type VehicleType = 'sedan' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'bus' | 'other';

export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'cng' | 'lpg';

export type TransmissionType = 'automatic' | 'manual' | 'cvt' | 'dct';

export type AcquisitionType = 'purchase' | 'lease' | 'donation' | 'transfer';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'emergency' | 'recall';

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'critical';

export type AssignmentType = 'permanent' | 'temporary' | 'pool' | 'project';

export type AssignmentStatus = 'active' | 'completed' | 'cancelled' | 'overdue';

export type IncidentType = 'accident' | 'theft' | 'vandalism' | 'breakdown' | 'damage';

export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'total_loss';

export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed';

export type ClaimStatus = 'filed' | 'in_progress' | 'approved' | 'rejected' | 'settled';

export type InspectionType = 'routine' | 'annual' | 'pre_trip' | 'post_trip' | 'safety' | 'compliance';

export type InspectionStatus = 'pass' | 'fail' | 'conditional';

export type DisposalMethod = 'sale' | 'auction' | 'scrap' | 'donation' | 'trade_in';

export type PaymentMethod = 'cash' | 'card' | 'fuel_card' | 'account' | 'mobile_money';

// =====================================================
// Extended Types with Relations
// =====================================================

export interface VehicleWithRelations extends Vehicle {
  current_location?: {
    id: string;
    name: string;
  };
  current_driver?: {
    id: string;
    full_name: string;
    email: string;
  };
  maintenance_count?: number;
  assignment_count?: number;
  incident_count?: number;
  fuel_logs_count?: number;
}

export interface MaintenanceRecordWithRelations extends MaintenanceRecord {
  vehicle: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
    current_mileage: number;
  };
  created_by_user?: {
    id: string;
    full_name: string;
  };
  completed_by_user?: {
    id: string;
    full_name: string;
  };
}

export interface FuelLogWithRelations extends FuelLog {
  vehicle: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  driver?: {
    id: string;
    full_name: string;
  };
}

export interface AssignmentWithRelations extends Assignment {
  vehicle: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  assigned_to?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_location?: {
    id: string;
    name: string;
    address: string;
  };
  authorized_by?: {
    id: string;
    full_name: string;
  };
}

export interface IncidentWithRelations extends Incident {
  vehicle: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  driver?: {
    id: string;
    full_name: string;
  };
}

export interface InspectionWithRelations extends Inspection {
  vehicle: {
    id: string;
    vehicle_id: string;
    make: string;
    model: string;
    license_plate: string;
  };
  inspector?: {
    id: string;
    full_name: string;
  };
}

// =====================================================
// JSON Field Types
// =====================================================

export interface DocumentFile {
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
  size?: number;
}

export interface PhotoFile {
  url: string;
  caption?: string;
  uploaded_at: string;
  thumbnail_url?: string;
}

export interface PartReplaced {
  part_name: string;
  part_number?: string;
  quantity: number;
  cost: number;
  supplier?: string;
}

export interface InvoiceFile {
  name: string;
  url: string;
  amount: number;
  uploaded_at: string;
}

export interface WitnessStatement {
  name: string;
  contact: string;
  statement: string;
  recorded_at: string;
}

export interface InspectionChecklistItem {
  item: string;
  category: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface InspectionCategory {
  status: 'pass' | 'fail' | 'conditional';
  notes?: string;
  issues?: string[];
}

// =====================================================
// Filter Types
// =====================================================

export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus;
  vehicle_type?: VehicleType;
  fuel_type?: FuelType;
  current_location_id?: string;
  current_driver_id?: string;
  make?: string;
  year_from?: number;
  year_to?: number;
  acquisition_type?: AcquisitionType;
  tags?: string[];
}

export interface MaintenanceFilters {
  search?: string;
  vehicle_id?: string;
  status?: MaintenanceStatus;
  maintenance_type?: MaintenanceType;
  priority?: MaintenancePriority;
  scheduled_date_from?: string;
  scheduled_date_to?: string;
  service_provider?: string;
}

export interface FuelLogFilters {
  vehicle_id?: string;
  driver_id?: string;
  date_from?: string;
  date_to?: string;
  fuel_type?: FuelType;
  station_name?: string;
  payment_method?: PaymentMethod;
}

export interface AssignmentFilters {
  search?: string;
  vehicle_id?: string;
  assigned_to_id?: string;
  assigned_location_id?: string;
  assignment_type?: AssignmentType;
  status?: AssignmentStatus;
  start_date_from?: string;
  start_date_to?: string;
}

export interface IncidentFilters {
  search?: string;
  vehicle_id?: string;
  driver_id?: string;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  date_from?: string;
  date_to?: string;
}

export interface InspectionFilters {
  search?: string;
  vehicle_id?: string;
  inspector_id?: string;
  inspection_type?: InspectionType;
  overall_status?: InspectionStatus;
  date_from?: string;
  date_to?: string;
  roadworthy?: boolean;
}

// =====================================================
// Analytics & Report Types
// =====================================================

export interface FleetSummary {
  total_vehicles: number;
  available_vehicles: number;
  in_use_vehicles: number;
  in_maintenance_vehicles: number;
  out_of_service_vehicles: number;
  disposed_vehicles: number;
  total_fleet_value: number;
  average_vehicle_age: number;
  total_mileage: number;
}

export interface MaintenanceSummary {
  total_maintenance_cost: number;
  scheduled_count: number;
  in_progress_count: number;
  completed_count: number;
  overdue_count: number;
  average_cost_per_service: number;
  most_common_service_type: string;
}

export interface FuelSummary {
  total_fuel_cost: number;
  total_fuel_quantity: number;
  average_fuel_efficiency: number;
  total_distance_traveled: number;
  most_used_station: string;
  fuel_cost_by_vehicle: Array<{
    vehicle_id: string;
    make: string;
    model: string;
    total_cost: number;
    total_quantity: number;
    efficiency: number;
  }>;
}

export interface IncidentSummary {
  total_incidents: number;
  accidents: number;
  thefts: number;
  breakdowns: number;
  total_repair_cost: number;
  total_insurance_payout: number;
  vehicles_with_most_incidents: Array<{
    vehicle_id: string;
    make: string;
    model: string;
    incident_count: number;
  }>;
}

export interface UtilizationReport {
  vehicle_id: string;
  make: string;
  model: string;
  license_plate: string;
  total_assignments: number;
  total_days_assigned: number;
  utilization_rate: number; // percentage
  average_trip_distance: number;
  total_mileage: number;
}

// =====================================================
// Form Data Types
// =====================================================

export interface VehicleFormData {
  // Basic Info
  make: string;
  model: string;
  year: number;
  vin?: string;
  license_plate: string;

  // Classification
  vehicle_type: VehicleType;
  fuel_type: FuelType;
  transmission?: TransmissionType;

  // Specifications
  engine_capacity?: number;
  color?: string;
  seating_capacity?: number;
  cargo_capacity?: number;

  // Acquisition
  acquisition_date: string;
  acquisition_type: AcquisitionType;
  purchase_price?: number;
  vendor_name?: string;
  warranty_expiry?: string;

  // Current Status
  status: VehicleStatus;
  current_location_id?: string;
  current_driver_id?: string;

  // Operational Metrics
  current_mileage?: number;

  // Insurance & Registration
  insurance_provider?: string;
  insurance_policy_number?: string;
  insurance_expiry?: string;
  registration_expiry?: string;

  // Financial
  depreciation_rate?: number;
  current_book_value?: number;

  // Metadata
  notes?: string;
  tags?: string[];
}

export interface MaintenanceFormData {
  vehicle_id: string;
  scheduled_date?: string;
  actual_date?: string;
  status: MaintenanceStatus;
  maintenance_type: MaintenanceType;
  category?: string;
  priority: MaintenancePriority;
  service_provider?: string;
  service_location?: string;
  technician_name?: string;
  work_order_number?: string;
  mileage_at_service?: number;
  labor_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  description: string;
  parts_replaced?: PartReplaced[];
  issues_found?: string;
  recommendations?: string;
  next_service_date?: string;
  next_service_mileage?: number;
}

export interface FuelLogFormData {
  vehicle_id: string;
  transaction_date: string;
  transaction_number?: string;
  station_name?: string;
  station_location?: string;
  latitude?: number;
  longitude?: number;
  fuel_type: FuelType;
  quantity: number;
  unit_price: number;
  odometer_reading: number;
  trip_distance?: number;
  payment_method?: PaymentMethod;
  fuel_card_number?: string;
  receipt_number?: string;
  driver_id?: string;
  driver_name?: string;
  notes?: string;
}

export interface AssignmentFormData {
  vehicle_id: string;
  assigned_to_id?: string;
  assigned_location_id?: string;
  assignment_type: AssignmentType;
  start_date: string;
  end_date?: string;
  purpose: string;
  project_name?: string;
  authorization_number?: string;
  authorized_by_id?: string;
  odometer_start?: number;
  fuel_level_start?: number;
  condition_start?: string;
  notes?: string;
}

export interface IncidentFormData {
  vehicle_id: string;
  incident_date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  driver_id?: string;
  driver_name: string;
  passengers?: string;
  other_parties?: string;
  odometer_reading?: number;
  description: string;
  cause?: string;
  damages_description?: string;
  police_report_number?: string;
  police_station?: string;
  estimated_repair_cost?: number;
}

export interface InspectionFormData {
  vehicle_id: string;
  inspection_date: string;
  inspection_type: InspectionType;
  inspector_id?: string;
  inspector_name: string;
  inspector_certification?: string;
  odometer_reading?: number;
  overall_status: InspectionStatus;
  checklist: InspectionChecklistItem[];
  exterior_condition?: InspectionCategory;
  interior_condition?: InspectionCategory;
  engine_mechanical?: InspectionCategory;
  electrical_system?: InspectionCategory;
  brakes?: InspectionCategory;
  tires?: InspectionCategory;
  lights_signals?: InspectionCategory;
  safety_equipment?: InspectionCategory;
  fluid_levels?: InspectionCategory;
  recommendations?: string;
  next_inspection_date?: string;
  meets_safety_standards: boolean;
  roadworthy: boolean;
  notes?: string;
}

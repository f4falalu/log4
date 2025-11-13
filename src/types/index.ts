// Facility Types
export type FacilityType = 'hospital' | 'clinic' | 'health_center' | 'pharmacy' | 'lab' | 'other';
export type IPName = 'smoh' | 'ace-2' | 'crs';
export type FundingSource = 'unfpa' | 'pepfar--usaid' | 'global-fund';
export type Programme = 'Family Planning' | 'DRF' | 'HIV/AIDS' | 'Malaria';
export type LevelOfCare = 'Tertiary' | 'Secondary' | 'Primary';
export type ServiceZone = 'Central' | 'Gaya' | 'Danbatta' | 'Gwarzo' | 'Rano';

export interface Facility {
  id: string;
  // Basic Info (legacy fields)
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: FacilityType;
  phone?: string;
  contactPerson?: string;
  capacity?: number;
  operatingHours?: string;

  // New Data Points (19 total)
  warehouse_code: string; // Format: PSM/KAN/##/### (1)
  state: string; // Default: 'kano' (2)
  ip_name?: IPName; // (3)
  funding_source?: FundingSource; // (4)
  programme?: Programme; // (5)
  pcr_service: boolean; // (6)
  cd4_service: boolean; // (7)
  type_of_service?: string; // (8) - can be multiple, comma-separated
  service_zone?: ServiceZone; // (10)
  level_of_care?: LevelOfCare; // (11)
  lga?: string; // (12)
  ward?: string; // (13)
  // address is (14)
  contact_name_pharmacy?: string; // (15)
  designation?: string; // (16)
  phone_pharmacy?: string; // (17)
  email?: string; // (18)
  // lat/lng are (19)
  storage_capacity?: number; // Additional field

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface FacilityService {
  id: string;
  facility_id: string;
  service_name: string;
  availability: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FacilityDelivery {
  id: string;
  facility_id: string;
  batch_id?: string;
  delivery_date: string;
  items_delivered: number;
  driver_id?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FacilityStock {
  id: string;
  facility_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit?: string;
  last_updated: string;
  updated_by?: string;
  created_at?: string;
}

export interface FacilityAuditLog {
  id: string;
  facility_id?: string;
  user_id?: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  changes?: Record<string, any>;
  timestamp: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'central' | 'zonal';
  capacity: number;
  operatingHours: string;
}

export interface Delivery {
  id: string;
  facilityId: string;
  facilityName: string;
  warehouseId: string;
  warehouseName: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  driver?: string;
  medicationType: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  estimatedDuration: number; // in minutes
  distance?: number; // in kilometers
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseType: 'standard' | 'commercial';
  status: 'available' | 'busy' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
  };
  shiftStart: string;
  shiftEnd: string;
  maxHours: number;
  licenseExpiry?: string;
  performanceScore?: number;
  totalDeliveries?: number;
  onTimePercentage?: number;
  onboardingCompleted?: boolean;
  licenseVerified?: boolean;
  locationUpdatedAt?: string;
}

export interface DriverVehicleHistory {
  vehicleId: string;
  plateNumber: string;
  model: string;
  type: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  aiGenerated?: boolean;
  capacity: number;
  fuelType: string;
  avgSpeed: number;
  isCurrent: boolean;
  assignedAt: string;
  totalTrips: number;
}

export interface Route {
  id: string;
  driverId: string;
  packageCount: number;
  address: string;
  destination: string;
  distance: number;
  timeLeft: number;
  weight: number;
  volume: number;
  date: string;
  status: 'on_the_way' | 'loading' | 'unloading' | 'waiting' | 'completed';
  mapPoints: { lat: number; lng: number }[];
}

export interface TimeCategory {
  onTheWay: number;
  unloading: number;
  loading: number;
  waiting: number;
}

export interface WorkingTimeData {
  date: string;
  workingTime: number;
  averageTime: number;
}

export interface DriverStatistics {
  timeCategories: TimeCategory;
  workingTimeData: WorkingTimeData[];
  totalDistance: number;
  totalDeliveries: number;
  averageRating: number;
}

export interface Vehicle {
  id: string;
  type: string; // Now supports custom types
  model: string;
  plateNumber: string;
  capacity: number; // in cubic meters
  maxWeight: number; // in kg
  fuelType: 'diesel' | 'petrol' | 'electric';
  avgSpeed: number; // km/h average speed
  status: 'available' | 'in-use' | 'maintenance';
  currentDriverId?: string;
  fuelEfficiency: number; // km per liter
  photo_url?: string;
  thumbnail_url?: string;
  photo_uploaded_at?: string;
  ai_generated?: boolean;
}

export interface DeliveryBatch {
  id: string;
  name: string;
  facilities: Facility[];
  warehouseId: string;
  warehouseName: string;
  driverId?: string;
  vehicleId?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  totalDistance: number;
  estimatedDuration: number; // in minutes
  actualStartTime?: string;
  actualEndTime?: string;
  medicationType: string;
  totalQuantity: number;
  optimizedRoute: [number, number][]; // lat, lng coordinates
  notes?: string;
  createdAt: string;
}

export interface RouteOptimization {
  warehouseId: string;
  facilities: Facility[];
  totalDistance: number;
  estimatedDuration: number;
  optimizedRoute: [number, number][];
  vehicleType?: 'truck' | 'van' | 'pickup' | 'car';
  driverId?: string;
  vehicleId?: string;
}

export interface CSVFacility {
  // Legacy fields
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  type?: string;
  phone?: string;
  contactPerson?: string;
  capacity?: string;
  operatingHours?: string;

  // New 19 data point fields
  warehouse_code?: string;
  state?: string;
  ip_name?: string;
  funding_source?: string;
  programme?: string;
  pcr_service?: string; // "Yes" or "No" in CSV
  cd4_service?: string; // "Yes" or "No" in CSV
  type_of_service?: string;
  service_zone?: string;
  level_of_care?: string;
  lga?: string;
  ward?: string;
  contact_name_pharmacy?: string;
  designation?: string;
  phone_pharmacy?: string;
  email?: string;
  storage_capacity?: string;
}

// Auth & IAM Types
export type AppRole = 'system_admin' | 'warehouse_officer' | 'dispatcher' | 'driver' | 'zonal_manager' | 'viewer';

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_by?: string;
  assigned_at: string;
}
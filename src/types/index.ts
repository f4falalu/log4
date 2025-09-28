export interface Facility {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  phone?: string;
  contactPerson?: string;
  capacity?: number;
  operatingHours?: string;
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

export interface RouteOptimization {
  warehouseId: string;
  facilities: Facility[];
  totalDistance: number;
  estimatedDuration: number;
}

export interface CSVFacility {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  type: string;
  phone?: string;
  contactPerson?: string;
  capacity?: string;
  operatingHours?: string;
}
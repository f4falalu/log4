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
  maxHours: number; // maximum working hours per day
}

export interface Vehicle {
  id: string;
  type: 'truck' | 'van' | 'pickup' | 'car';
  model: string;
  plateNumber: string;
  capacity: number; // in cubic meters
  maxWeight: number; // in kg
  fuelType: 'diesel' | 'petrol' | 'electric';
  avgSpeed: number; // km/h average speed
  status: 'available' | 'in-use' | 'maintenance';
  currentDriverId?: string;
  fuelEfficiency: number; // km per liter
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
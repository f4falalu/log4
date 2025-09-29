import { Driver, Vehicle } from '@/types';

export const DRIVERS: Driver[] = [
  {
    id: 'driver-1',
    name: 'Aminu Hassan',
    phone: '+234-801-234-5678',
    licenseType: 'commercial',
    status: 'available',
    currentLocation: {
      lat: 12.0022,
      lng: 8.5324
    },
    shiftStart: '06:00',
    shiftEnd: '18:00',
    maxHours: 10
  },
  {
    id: 'driver-2',
    name: 'Fatima Bello',
    phone: '+234-802-345-6789',
    licenseType: 'commercial',
    status: 'available',
    currentLocation: {
      lat: 11.9945,
      lng: 8.5201
    },
    shiftStart: '08:00',
    shiftEnd: '20:00',
    maxHours: 10
  },
  {
    id: 'driver-3',
    name: 'Ibrahim Musa',
    phone: '+234-803-456-7890',
    licenseType: 'standard',
    status: 'available',
    currentLocation: {
      lat: 12.4355,
      lng: 8.5151
    },
    shiftStart: '07:00',
    shiftEnd: '19:00',
    maxHours: 10
  },
  {
    id: 'driver-4',
    name: 'Aisha Yakubu',
    phone: '+234-804-567-8901',
    licenseType: 'standard',
    status: 'busy',
    currentLocation: {
      lat: 11.5654,
      lng: 8.5731
    },
    shiftStart: '09:00',
    shiftEnd: '21:00',
    maxHours: 9
  }
];

export const VEHICLES: Vehicle[] = [
  {
    id: 'vehicle-1',
    type: 'truck',
    model: 'Mercedes Atego 1518',
    plateNumber: 'KN-234-ABC',
    capacity: 12.5, // cubic meters
    maxWeight: 7500, // kg
    fuelType: 'diesel',
    avgSpeed: 45, // km/h
    status: 'available',
    currentDriverId: undefined,
    fuelEfficiency: 8 // km per liter
  },
  {
    id: 'vehicle-2',
    type: 'van',
    model: 'Toyota Hiace',
    plateNumber: 'KN-567-DEF',
    capacity: 8.0,
    maxWeight: 3000,
    fuelType: 'petrol',
    avgSpeed: 55,
    status: 'available',
    currentDriverId: undefined,
    fuelEfficiency: 12
  },
  {
    id: 'vehicle-3',
    type: 'pickup',
    model: 'Toyota Hilux',
    plateNumber: 'KN-890-GHI',
    capacity: 4.5,
    maxWeight: 1500,
    fuelType: 'diesel',
    avgSpeed: 60,
    status: 'available',
    currentDriverId: undefined,
    fuelEfficiency: 14
  },
  {
    id: 'vehicle-4',
    type: 'car',
    model: 'Toyota Corolla',
    plateNumber: 'KN-123-JKL',
    capacity: 1.8,
    maxWeight: 500,
    fuelType: 'petrol',
    avgSpeed: 65,
    status: 'in-use',
    currentDriverId: 'driver-4',
    fuelEfficiency: 16
  }
];
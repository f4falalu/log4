/**
 * Kano State Vehicles - Demo Dataset
 *
 * Fleet distribution across vehicle classes
 */

import type { Vehicle } from '@/types';

export const vehicles: Vehicle[] = [
  // Vans (Urban routes)
  {
    id: 'veh-van-01',
    label: 'Kano-VAN-01',
    type: 'van',
    // capacitySlots: 20,
    // currentSlots: 20,
    // Assuming lat/lng are part of Vehicle type, adjust as needed
    lat: 12.0022,
    lng: 8.5167,
    // bearing: 0,
    status: 'active' as const,
    // Add other required Vehicle fields based on your types
  },
  {
    id: 'veh-van-02',
    label: 'Kano-VAN-02',
    type: 'van',
    lat: 12.0022,
    lng: 8.5167,
    status: 'active' as const,
  },
  {
    id: 'veh-van-03',
    label: 'Kano-VAN-03',
    type: 'van',
    lat: 12.0022,
    lng: 8.5167,
    status: 'active' as const,
  },

  // Trucks (Mixed urban/semi-rural)
  {
    id: 'veh-truck-01',
    label: 'Kano-TRK-01',
    type: 'truck',
    lat: 12.0022,
    lng: 8.5167,
    status: 'active' as const,
  },
  {
    id: 'veh-truck-02',
    label: 'Kano-TRK-02',
    type: 'truck',
    lat: 11.9312,
    lng: 8.4956,
    status: 'active' as const,
  },

  // Motorcycles (Dense urban, quick delivery)
  {
    id: 'veh-bike-01',
    label: 'Kano-BIKE-01',
    type: 'motorcycle',
    lat: 12.0054,
    lng: 8.5227,
    status: 'active' as const,
  },
  {
    id: 'veh-bike-02',
    label: 'Kano-BIKE-02',
    type: 'motorcycle',
    lat: 12.0171,
    lng: 8.5241,
    status: 'active' as const,
  },
];

/**
 * Extended vehicle data for simulation
 * (includes capacity, bearing, etc. that might not be in base Vehicle type)
 */
export interface SimulationVehicle extends Vehicle {
  capacitySlots: number;
  currentSlots: number;
  bearing: number;
  baseSpeedKmh: number;
}

export const simulationVehicles: SimulationVehicle[] = [
  {
    ...vehicles[0],
    capacitySlots: 20,
    currentSlots: 20,
    bearing: 0,
    baseSpeedKmh: 40,
  },
  {
    ...vehicles[1],
    capacitySlots: 20,
    currentSlots: 20,
    bearing: 90,
    baseSpeedKmh: 40,
  },
  {
    ...vehicles[2],
    capacitySlots: 20,
    currentSlots: 20,
    bearing: 180,
    baseSpeedKmh: 40,
  },
  {
    ...vehicles[3],
    capacitySlots: 40,
    currentSlots: 40,
    bearing: 270,
    baseSpeedKmh: 35,
  },
  {
    ...vehicles[4],
    capacitySlots: 40,
    currentSlots: 40,
    bearing: 45,
    baseSpeedKmh: 35,
  },
  {
    ...vehicles[5],
    capacitySlots: 6,
    currentSlots: 6,
    bearing: 135,
    baseSpeedKmh: 50,
  },
  {
    ...vehicles[6],
    capacitySlots: 6,
    currentSlots: 6,
    bearing: 225,
    baseSpeedKmh: 50,
  },
];

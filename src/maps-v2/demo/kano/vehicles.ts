/**
 * Demo vehicle dataset — Kano region, Nigeria.
 */

import type { VehicleData } from '../../layers/VehicleLayer';

export interface DemoVehicle extends VehicleData {
  routeId: string;
}

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: 'v-001',
    label: 'KN-VAN-01',
    type: 'van',
    lat: 12.0022,
    lng: 8.5120,
    bearing: 45,
    speed: 35,
    status: 'active',
    routeId: 'r-001',
  },
  {
    id: 'v-002',
    label: 'KN-VAN-02',
    type: 'van',
    lat: 11.9950,
    lng: 8.5300,
    bearing: 120,
    speed: 28,
    status: 'active',
    routeId: 'r-002',
  },
  {
    id: 'v-003',
    label: 'KN-TRUCK-01',
    type: 'truck',
    lat: 12.0100,
    lng: 8.4900,
    bearing: 270,
    speed: 20,
    status: 'active',
    routeId: 'r-003',
  },
  {
    id: 'v-004',
    label: 'KN-MOTO-01',
    type: 'motorcycle',
    lat: 12.0200,
    lng: 8.5400,
    bearing: 180,
    speed: 45,
    status: 'active',
    routeId: 'r-004',
  },
  {
    id: 'v-005',
    label: 'KN-VAN-03',
    type: 'van',
    lat: 11.9800,
    lng: 8.5050,
    bearing: 0,
    speed: 0,
    status: 'idle',
    routeId: 'r-005',
  },
  {
    id: 'v-006',
    label: 'KN-TRUCK-02',
    type: 'truck',
    lat: 12.0350,
    lng: 8.5250,
    bearing: 90,
    speed: 15,
    status: 'delayed',
    routeId: 'r-006',
  },
  {
    id: 'v-007',
    label: 'KN-MOTO-02',
    type: 'motorcycle',
    lat: 12.0050,
    lng: 8.5600,
    bearing: 315,
    speed: 0,
    status: 'offline',
    routeId: 'r-007',
  },
  {
    id: 'v-008',
    label: 'KN-VAN-04',
    type: 'van',
    lat: 11.9900,
    lng: 8.4800,
    bearing: 60,
    speed: 32,
    status: 'active',
    routeId: 'r-008',
  },
];

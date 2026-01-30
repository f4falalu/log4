/**
 * Demo warehouse dataset — Kano region.
 */

import type { WarehouseData } from '../../layers/WarehouseLayer';

export const DEMO_WAREHOUSES: WarehouseData[] = [
  {
    id: 'w-001',
    name: 'Bompai Warehouse',
    lat: 12.0200,
    lng: 8.5500,
    capacity: 5000,
    utilization: 0.72,
  },
  {
    id: 'w-002',
    name: 'Sharada Industrial',
    lat: 11.9600,
    lng: 8.4700,
    capacity: 8000,
    utilization: 0.85,
  },
  {
    id: 'w-003',
    name: 'Challawa Logistics',
    lat: 11.9400,
    lng: 8.5100,
    capacity: 3500,
    utilization: 0.45,
  },
];

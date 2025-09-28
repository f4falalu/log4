import { Warehouse } from '@/types';

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'central-warehouse',
    name: 'Central Warehouse',
    address: 'Central Distribution Center, Nigeria',
    lat: 12.001529329506248,
    lng: 12.001529329506249, // Using DMA_lat as lng for now
    type: 'central',
    capacity: 10000,
    operatingHours: '24/7'
  },
  {
    id: 'rano-zonal',
    name: 'Rano Zonal Warehouse',
    address: 'Rano, Kano State, Nigeria',
    lat: 11.565417,
    lng: 8.5730572,
    type: 'zonal',
    capacity: 5000,
    operatingHours: '6:00 AM - 8:00 PM'
  },
  {
    id: 'danbatta-zonal',
    name: 'Danbatta Zonal Warehouse',
    address: 'Danbatta, Kano State, Nigeria',
    lat: 12.43557,
    lng: 8.515110,
    type: 'zonal',
    capacity: 5000,
    operatingHours: '6:00 AM - 8:00 PM'
  }
];
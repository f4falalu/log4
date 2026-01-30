/**
 * Demo facility dataset — Kano region.
 */

import type { FacilityData } from '../../layers/FacilityLayer';

export const DEMO_FACILITIES: FacilityData[] = [
  {
    id: 'f-001',
    name: 'Kano Central Hub',
    lat: 12.0000,
    lng: 8.5167,
    type: 'hub',
  },
  {
    id: 'f-002',
    name: 'Nassarawa Depot',
    lat: 11.9850,
    lng: 8.5350,
    type: 'depot',
  },
  {
    id: 'f-003',
    name: 'Tarauni Station',
    lat: 11.9700,
    lng: 8.4900,
    type: 'station',
  },
  {
    id: 'f-004',
    name: 'Gwale Clinic',
    lat: 12.0150,
    lng: 8.5050,
    type: 'clinic',
  },
  {
    id: 'f-005',
    name: 'Fagge Distribution',
    lat: 12.0250,
    lng: 8.5300,
    type: 'depot',
  },
];

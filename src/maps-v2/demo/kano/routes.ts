/**
 * Demo route dataset — Kano region.
 * Each route is a sequence of [lng, lat] coordinates.
 */

import type { RouteData } from '../../layers/RouteLayer';

export const DEMO_ROUTES: RouteData[] = [
  {
    id: 'r-001',
    vehicleId: 'v-001',
    progress: 0.35,
    status: 'active',
    coordinates: [
      [8.5167, 12.0000], // Start: Central Hub
      [8.5200, 12.0030],
      [8.5250, 12.0060],
      [8.5300, 12.0050],
      [8.5350, 12.0080],
      [8.5400, 12.0100],
      [8.5500, 12.0200], // End: Bompai
    ],
  },
  {
    id: 'r-002',
    vehicleId: 'v-002',
    progress: 0.6,
    status: 'active',
    coordinates: [
      [8.5167, 12.0000],
      [8.5200, 11.9950],
      [8.5250, 11.9900],
      [8.5300, 11.9880],
      [8.5350, 11.9850], // End: Nassarawa
    ],
  },
  {
    id: 'r-003',
    vehicleId: 'v-003',
    progress: 0.2,
    status: 'active',
    coordinates: [
      [8.5167, 12.0000],
      [8.5100, 12.0020],
      [8.5000, 12.0050],
      [8.4900, 12.0080],
      [8.4800, 12.0100],
      [8.4700, 11.9600], // End: Sharada
    ],
  },
  {
    id: 'r-004',
    vehicleId: 'v-004',
    progress: 0.8,
    status: 'active',
    coordinates: [
      [8.5300, 12.0250],
      [8.5350, 12.0200],
      [8.5400, 12.0150],
      [8.5450, 12.0100],
      [8.5500, 12.0050],
    ],
  },
  {
    id: 'r-005',
    vehicleId: 'v-005',
    progress: 0,
    status: 'planned',
    coordinates: [
      [8.5050, 11.9800],
      [8.5100, 11.9750],
      [8.5100, 11.9700], // End: Tarauni
    ],
  },
  {
    id: 'r-006',
    vehicleId: 'v-006',
    progress: 0.45,
    status: 'active',
    coordinates: [
      [8.5167, 12.0000],
      [8.5200, 12.0100],
      [8.5220, 12.0200],
      [8.5250, 12.0300],
      [8.5250, 12.0350],
    ],
  },
  {
    id: 'r-007',
    vehicleId: 'v-007',
    progress: 1,
    status: 'completed',
    coordinates: [
      [8.5500, 12.0200],
      [8.5550, 12.0100],
      [8.5600, 12.0050],
    ],
  },
  {
    id: 'r-008',
    vehicleId: 'v-008',
    progress: 0.5,
    status: 'active',
    coordinates: [
      [8.4700, 11.9600],
      [8.4750, 11.9700],
      [8.4800, 11.9800],
      [8.4850, 11.9900],
      [8.4900, 12.0000],
    ],
  },
];

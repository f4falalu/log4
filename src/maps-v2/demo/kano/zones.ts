/**
 * Demo zone dataset — Kano region.
 * Zones with H3 cells and tags for demonstration.
 */

import { latLngToH3 } from '../../layers/h3Utils';
import type { Zone } from '../../contracts/Zone';
import type { ZoneTag } from '../../contracts/ZoneTag';

// Generate H3 cells around a center point by creating a grid
function generateCellCluster(centerLat: number, centerLng: number, radius: number): string[] {
  const cells: string[] = [];
  const step = 0.008; // roughly one H3 res-7 cell diameter

  for (let dLat = -radius; dLat <= radius; dLat++) {
    for (let dLng = -radius; dLng <= radius; dLng++) {
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist <= radius) {
        const cell = latLngToH3(centerLat + dLat * step, centerLng + dLng * step);
        if (!cells.includes(cell)) {
          cells.push(cell);
        }
      }
    }
  }

  return cells;
}

export function getDemoZones(): Zone[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'zone-001',
      name: 'Kano Central District',
      description: 'Core urban delivery zone around city center',
      h3Indexes: generateCellCluster(12.0000, 8.5167, 3),
      status: 'active',
      createdAt: now,
      createdBy: 'demo-user',
      updatedAt: now,
      updatedBy: 'demo-user',
    },
    {
      id: 'zone-002',
      name: 'Nassarawa Industrial',
      description: 'Industrial area with restricted access times',
      h3Indexes: generateCellCluster(11.9850, 8.5350, 2),
      status: 'active',
      createdAt: now,
      createdBy: 'demo-user',
      updatedAt: now,
      updatedBy: 'demo-user',
    },
    {
      id: 'zone-003',
      name: 'Fagge Market Area',
      description: 'Dense market zone — high congestion risk',
      h3Indexes: generateCellCluster(12.0250, 8.5300, 2),
      status: 'active',
      createdAt: now,
      createdBy: 'demo-user',
      updatedAt: now,
      updatedBy: 'demo-user',
    },
  ];
}

export function getDemoZoneTags(): ZoneTag[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'tag-001',
      zoneId: 'zone-002',
      type: 'RESTRICTED_ACCESS',
      severity: 3,
      confidence: 0.8,
      validFrom: now,
      validTo: null,
      createdAt: now,
      createdBy: 'demo-user',
    },
    {
      id: 'tag-002',
      zoneId: 'zone-003',
      type: 'HARD_TO_REACH',
      severity: 4,
      confidence: 0.9,
      validFrom: now,
      validTo: null,
      createdAt: now,
      createdBy: 'demo-user',
    },
    {
      id: 'tag-003',
      zoneId: 'zone-003',
      type: 'SECURITY_THREAT',
      severity: 2,
      confidence: 0.5,
      validFrom: now,
      validTo: null,
      createdAt: now,
      createdBy: 'demo-user',
    },
    {
      id: 'tag-004',
      zoneId: 'zone-001',
      type: 'FLOOD_RISK',
      severity: 1,
      confidence: 0.3,
      validFrom: now,
      validTo: null,
      createdAt: now,
      createdBy: 'demo-user',
    },
  ];
}

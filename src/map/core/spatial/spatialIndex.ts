/**
 * spatialIndex.ts
 *
 * Performance backbone for spatial lookups.
 *
 * GOVERNANCE:
 * - Enables O(1) lookups for zone membership and geofencing
 * - Index rebuilt on zone mutation
 * - Index is the ONLY lookup path (no scanning)
 * - No map imports
 * - No UI imports
 *
 * This is the performance layer, not the truth layer.
 */

import type { Zone } from './zones';

/**
 * Spatial index data structure
 * Maps H3 cell indexes to zone IDs
 */
export interface SpatialIndex {
  /** Cell -> Zone IDs mapping */
  cellToZones: Map<string, Set<string>>;

  /** Zone -> Cells mapping (reverse index) */
  zoneToCells: Map<string, Set<string>>;

  /** Zone ID -> Zone reference */
  zonesById: Map<string, Zone>;

  /** Last rebuild timestamp */
  builtAt: number;

  /** Number of indexed cells */
  cellCount: number;

  /** Number of indexed zones */
  zoneCount: number;
}

/**
 * Build a spatial index from zones
 *
 * @param zones - Array of active zones
 * @returns Spatial index
 */
export function buildSpatialIndex(zones: Zone[]): SpatialIndex {
  const cellToZones = new Map<string, Set<string>>();
  const zoneToCells = new Map<string, Set<string>>();
  const zonesById = new Map<string, Zone>();

  let cellCount = 0;

  for (const zone of zones) {
    // Skip inactive zones
    if (!zone.active) continue;

    zonesById.set(zone.id, zone);
    zoneToCells.set(zone.id, new Set(zone.h3Cells));

    for (const cell of zone.h3Cells) {
      let zoneSet = cellToZones.get(cell);
      if (!zoneSet) {
        zoneSet = new Set();
        cellToZones.set(cell, zoneSet);
        cellCount++;
      }
      zoneSet.add(zone.id);
    }
  }

  return {
    cellToZones,
    zoneToCells,
    zonesById,
    builtAt: Date.now(),
    cellCount,
    zoneCount: zonesById.size,
  };
}

/**
 * Get all zones that contain a cell
 *
 * @param index - Spatial index
 * @param h3Index - H3 cell to look up
 * @returns Array of zone IDs (empty if none)
 */
export function getZonesForCell(index: SpatialIndex, h3Index: string): string[] {
  const zones = index.cellToZones.get(h3Index);
  return zones ? Array.from(zones) : [];
}

/**
 * Get zone objects for a cell
 *
 * @param index - Spatial index
 * @param h3Index - H3 cell to look up
 * @returns Array of Zone objects
 */
export function getZoneObjectsForCell(index: SpatialIndex, h3Index: string): Zone[] {
  const zoneIds = getZonesForCell(index, h3Index);
  return zoneIds
    .map((id) => index.zonesById.get(id))
    .filter((z): z is Zone => z !== undefined);
}

/**
 * Check if a cell is in any zone
 *
 * @param index - Spatial index
 * @param h3Index - H3 cell to check
 * @returns true if cell is in at least one zone
 */
export function isCellInAnyZone(index: SpatialIndex, h3Index: string): boolean {
  return index.cellToZones.has(h3Index);
}

/**
 * Check if a cell is in a specific zone
 *
 * @param index - Spatial index
 * @param h3Index - H3 cell to check
 * @param zoneId - Zone to check membership in
 * @returns true if cell is in the zone
 */
export function isCellInZone(
  index: SpatialIndex,
  h3Index: string,
  zoneId: string
): boolean {
  const zones = index.cellToZones.get(h3Index);
  return zones?.has(zoneId) ?? false;
}

/**
 * Get all cells in a zone
 *
 * @param index - Spatial index
 * @param zoneId - Zone ID
 * @returns Array of H3 cell indexes
 */
export function getCellsForZone(index: SpatialIndex, zoneId: string): string[] {
  const cells = index.zoneToCells.get(zoneId);
  return cells ? Array.from(cells) : [];
}

/**
 * Get a zone by ID
 *
 * @param index - Spatial index
 * @param zoneId - Zone ID
 * @returns Zone or undefined
 */
export function getZoneById(index: SpatialIndex, zoneId: string): Zone | undefined {
  return index.zonesById.get(zoneId);
}

/**
 * Get all indexed zones
 *
 * @param index - Spatial index
 * @returns Array of all zones
 */
export function getAllZones(index: SpatialIndex): Zone[] {
  return Array.from(index.zonesById.values());
}

/**
 * Get all indexed zone IDs
 *
 * @param index - Spatial index
 * @returns Array of zone IDs
 */
export function getAllZoneIds(index: SpatialIndex): string[] {
  return Array.from(index.zonesById.keys());
}

/**
 * Get all indexed cells
 *
 * @param index - Spatial index
 * @returns Array of all H3 cell indexes
 */
export function getAllCells(index: SpatialIndex): string[] {
  return Array.from(index.cellToZones.keys());
}

/**
 * Find zones that overlap with a set of cells
 *
 * @param index - Spatial index
 * @param cells - H3 cells to check
 * @returns Array of zone IDs that overlap
 */
export function findOverlappingZones(index: SpatialIndex, cells: string[]): string[] {
  const overlapping = new Set<string>();

  for (const cell of cells) {
    const zones = index.cellToZones.get(cell);
    if (zones) {
      zones.forEach((zoneId) => overlapping.add(zoneId));
    }
  }

  return Array.from(overlapping);
}

/**
 * Get zones adjacent to a cell (in neighboring cells)
 *
 * @param index - Spatial index
 * @param h3Index - Center cell
 * @param neighborCells - Array of neighboring H3 cells
 * @returns Array of zone IDs in neighboring cells
 */
export function getAdjacentZones(
  index: SpatialIndex,
  h3Index: string,
  neighborCells: string[]
): string[] {
  const currentZones = new Set(getZonesForCell(index, h3Index));
  const adjacentZones = new Set<string>();

  for (const neighbor of neighborCells) {
    const zones = index.cellToZones.get(neighbor);
    if (zones) {
      zones.forEach((zoneId) => {
        if (!currentZones.has(zoneId)) {
          adjacentZones.add(zoneId);
        }
      });
    }
  }

  return Array.from(adjacentZones);
}

/**
 * Update index incrementally when a single zone changes
 * More efficient than full rebuild for single zone changes
 *
 * @param index - Current index
 * @param oldZone - Previous zone state (or null if new)
 * @param newZone - New zone state (or null if deleted)
 * @returns Updated spatial index
 */
export function updateIndexForZone(
  index: SpatialIndex,
  oldZone: Zone | null,
  newZone: Zone | null
): SpatialIndex {
  // Clone the index
  const newIndex: SpatialIndex = {
    cellToZones: new Map(index.cellToZones),
    zoneToCells: new Map(index.zoneToCells),
    zonesById: new Map(index.zonesById),
    builtAt: Date.now(),
    cellCount: index.cellCount,
    zoneCount: index.zoneCount,
  };

  // Deep clone the Sets we'll modify
  newIndex.cellToZones.forEach((set, key) => {
    newIndex.cellToZones.set(key, new Set(set));
  });

  // Remove old zone entries
  if (oldZone) {
    newIndex.zonesById.delete(oldZone.id);
    newIndex.zoneToCells.delete(oldZone.id);

    for (const cell of oldZone.h3Cells) {
      const zones = newIndex.cellToZones.get(cell);
      if (zones) {
        zones.delete(oldZone.id);
        if (zones.size === 0) {
          newIndex.cellToZones.delete(cell);
          newIndex.cellCount--;
        }
      }
    }

    if (!newZone || !newZone.active) {
      newIndex.zoneCount--;
    }
  }

  // Add new zone entries
  if (newZone && newZone.active) {
    newIndex.zonesById.set(newZone.id, newZone);
    newIndex.zoneToCells.set(newZone.id, new Set(newZone.h3Cells));

    for (const cell of newZone.h3Cells) {
      let zones = newIndex.cellToZones.get(cell);
      if (!zones) {
        zones = new Set();
        newIndex.cellToZones.set(cell, zones);
        newIndex.cellCount++;
      }
      zones.add(newZone.id);
    }

    if (!oldZone) {
      newIndex.zoneCount++;
    }
  }

  return newIndex;
}

/**
 * Get index statistics for debugging
 */
export function getIndexStats(index: SpatialIndex): {
  cellCount: number;
  zoneCount: number;
  avgZonesPerCell: number;
  avgCellsPerZone: number;
  builtAt: Date;
} {
  let totalZonesPerCell = 0;
  index.cellToZones.forEach((zones) => {
    totalZonesPerCell += zones.size;
  });

  let totalCellsPerZone = 0;
  index.zoneToCells.forEach((cells) => {
    totalCellsPerZone += cells.size;
  });

  return {
    cellCount: index.cellCount,
    zoneCount: index.zoneCount,
    avgZonesPerCell: index.cellCount > 0 ? totalZonesPerCell / index.cellCount : 0,
    avgCellsPerZone: index.zoneCount > 0 ? totalCellsPerZone / index.zoneCount : 0,
    builtAt: new Date(index.builtAt),
  };
}

/**
 * Create an empty spatial index
 */
export function createEmptyIndex(): SpatialIndex {
  return {
    cellToZones: new Map(),
    zoneToCells: new Map(),
    zonesById: new Map(),
    builtAt: Date.now(),
    cellCount: 0,
    zoneCount: 0,
  };
}

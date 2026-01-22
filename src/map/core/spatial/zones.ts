/**
 * zones.ts
 *
 * Zone domain model.
 *
 * GOVERNANCE:
 * - Zones are SETS OF H3 CELLS, not polygons
 * - No geometry math here
 * - Zones are mutable but auditable
 * - No implicit deletion
 * - No map imports
 * - No UI imports
 *
 * This defines WHAT a zone IS, independent of rendering.
 */

import { deduplicateCells, isValidH3Index } from './h3';

/**
 * Zone definition
 * The authoritative representation of a zone
 */
export interface Zone {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** H3 cell indexes that comprise this zone */
  h3Cells: string[];

  /** Applied tags (semantic meaning) */
  tags: string[];

  /** Whether zone is active (soft delete) */
  active: boolean;

  /** Zone metadata */
  metadata: ZoneMetadata;

  /** Audit timestamps */
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Zone metadata
 */
export interface ZoneMetadata {
  /** Optional description */
  description?: string;

  /** Optional parent zone for hierarchy */
  parentZoneId?: string;

  /** Optional external reference ID */
  externalId?: string;

  /** Custom key-value pairs */
  custom?: Record<string, string | number | boolean>;
}

/**
 * Input for creating a zone
 */
export interface CreateZoneInput {
  name: string;
  h3Cells: string[];
  tags?: string[];
  metadata?: Partial<ZoneMetadata>;
  createdBy: string;
}

/**
 * Input for updating a zone
 */
export interface UpdateZoneInput {
  name?: string;
  h3Cells?: string[];
  tags?: string[];
  metadata?: Partial<ZoneMetadata>;
  updatedBy: string;
}

/**
 * Zone validation result
 */
export interface ZoneValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Generate a unique zone ID
 */
export function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate zone input
 */
export function validateZoneInput(input: CreateZoneInput): ZoneValidationResult {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Zone name is required');
  }

  if (!input.h3Cells || input.h3Cells.length === 0) {
    errors.push('Zone must contain at least one H3 cell');
  }

  // Validate all H3 cells
  const invalidCells = input.h3Cells?.filter((cell) => !isValidH3Index(cell)) ?? [];
  if (invalidCells.length > 0) {
    errors.push(`Invalid H3 cells: ${invalidCells.slice(0, 5).join(', ')}${invalidCells.length > 5 ? '...' : ''}`);
  }

  if (!input.createdBy) {
    errors.push('createdBy is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new zone
 */
export function createZone(input: CreateZoneInput): Zone {
  const validation = validateZoneInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid zone input: ${validation.errors.join(', ')}`);
  }

  const now = new Date().toISOString();

  return {
    id: generateZoneId(),
    name: input.name.trim(),
    h3Cells: deduplicateCells(input.h3Cells),
    tags: input.tags ?? [],
    active: true,
    metadata: {
      description: input.metadata?.description,
      parentZoneId: input.metadata?.parentZoneId,
      externalId: input.metadata?.externalId,
      custom: input.metadata?.custom,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  };
}

/**
 * Update an existing zone
 * Returns a new zone object (immutable update)
 */
export function updateZone(zone: Zone, input: UpdateZoneInput): Zone {
  if (!input.updatedBy) {
    throw new Error('updatedBy is required');
  }

  const now = new Date().toISOString();

  return {
    ...zone,
    name: input.name?.trim() ?? zone.name,
    h3Cells: input.h3Cells ? deduplicateCells(input.h3Cells) : zone.h3Cells,
    tags: input.tags ?? zone.tags,
    metadata: {
      ...zone.metadata,
      ...input.metadata,
    },
    updatedAt: now,
    updatedBy: input.updatedBy,
  };
}

/**
 * Deactivate a zone (soft delete)
 */
export function deactivateZone(zone: Zone, deactivatedBy: string): Zone {
  return {
    ...zone,
    active: false,
    updatedAt: new Date().toISOString(),
    updatedBy: deactivatedBy,
  };
}

/**
 * Reactivate a zone
 */
export function reactivateZone(zone: Zone, reactivatedBy: string): Zone {
  return {
    ...zone,
    active: true,
    updatedAt: new Date().toISOString(),
    updatedBy: reactivatedBy,
  };
}

/**
 * Add tags to a zone
 */
export function addTagsToZone(zone: Zone, tags: string[], updatedBy: string): Zone {
  const newTags = Array.from(new Set([...zone.tags, ...tags]));

  return {
    ...zone,
    tags: newTags,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

/**
 * Remove tags from a zone
 */
export function removeTagsFromZone(zone: Zone, tags: string[], updatedBy: string): Zone {
  const tagSet = new Set(tags);
  const newTags = zone.tags.filter((tag) => !tagSet.has(tag));

  return {
    ...zone,
    tags: newTags,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

/**
 * Add cells to a zone
 */
export function addCellsToZone(zone: Zone, cells: string[], updatedBy: string): Zone {
  // Validate new cells
  const invalidCells = cells.filter((cell) => !isValidH3Index(cell));
  if (invalidCells.length > 0) {
    throw new Error(`Invalid H3 cells: ${invalidCells.join(', ')}`);
  }

  const newCells = deduplicateCells([...zone.h3Cells, ...cells]);

  return {
    ...zone,
    h3Cells: newCells,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

/**
 * Remove cells from a zone
 */
export function removeCellsFromZone(zone: Zone, cells: string[], updatedBy: string): Zone {
  const cellSet = new Set(cells);
  const newCells = zone.h3Cells.filter((cell) => !cellSet.has(cell));

  if (newCells.length === 0) {
    throw new Error('Cannot remove all cells from a zone. Deactivate instead.');
  }

  return {
    ...zone,
    h3Cells: newCells,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

/**
 * Check if a cell is in a zone
 */
export function isCellInZone(zone: Zone, h3Index: string): boolean {
  return zone.h3Cells.includes(h3Index);
}

/**
 * Get zone cell count
 */
export function getZoneCellCount(zone: Zone): number {
  return zone.h3Cells.length;
}

/**
 * Check if two zones overlap (share any cells)
 */
export function zonesOverlap(zoneA: Zone, zoneB: Zone): boolean {
  const cellSet = new Set(zoneA.h3Cells);
  return zoneB.h3Cells.some((cell) => cellSet.has(cell));
}

/**
 * Get cells shared between two zones
 */
export function getSharedCells(zoneA: Zone, zoneB: Zone): string[] {
  const cellSet = new Set(zoneA.h3Cells);
  return zoneB.h3Cells.filter((cell) => cellSet.has(cell));
}

/**
 * Merge zones into a new zone
 */
export function mergeZones(
  zones: Zone[],
  name: string,
  createdBy: string
): Zone {
  if (zones.length === 0) {
    throw new Error('Cannot merge empty zone list');
  }

  const allCells = zones.flatMap((z) => z.h3Cells);
  const allTags = zones.flatMap((z) => z.tags);

  return createZone({
    name,
    h3Cells: deduplicateCells(allCells),
    tags: Array.from(new Set(allTags)),
    createdBy,
  });
}

/**
 * Clone a zone with a new ID
 */
export function cloneZone(zone: Zone, name: string, createdBy: string): Zone {
  return createZone({
    name,
    h3Cells: [...zone.h3Cells],
    tags: [...zone.tags],
    metadata: { ...zone.metadata },
    createdBy,
  });
}

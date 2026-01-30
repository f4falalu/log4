/**
 * Spatial Core Module
 *
 * AUTHORITATIVE SPATIAL TRUTH LAYER
 *
 * This module owns ALL spatial logic in the system.
 * The map is a projection layer that renders this truth.
 *
 * GOVERNANCE:
 * - No MapLibre imports anywhere in this module
 * - No React imports anywhere in this module
 * - No viewport awareness
 * - No zoom awareness
 * - Pure domain logic only
 */

// H3 Canonicalization
export {
  H3_RESOLUTION,
  latLngToCell,
  polygonToCells,
  cellToPolygon,
  cellsToMultiPolygon,
  getCellCenter,
  getCellsInRadius,
  getCellsInRing,
  getCellAreaKm2,
  isValidH3Index,
  getCellResolution,
  isCanonicalResolution,
  featureToCells,
  getCellBoundaryCoords,
  batchLatLngToCells,
  deduplicateCells,
} from './h3';

// Zone Domain Model
export {
  type Zone,
  type ZoneMetadata,
  type CreateZoneInput,
  type UpdateZoneInput,
  type ZoneValidationResult,
  generateZoneId,
  validateZoneInput,
  createZone,
  updateZone,
  deactivateZone,
  reactivateZone,
  addTagsToZone,
  removeTagsFromZone,
  addCellsToZone,
  removeCellsFromZone,
  isCellInZone,
  getZoneCellCount,
  zonesOverlap,
  getSharedCells,
  mergeZones,
  cloneZone,
} from './zones';

// Zone Tags
export {
  type ZoneTag,
  type ZoneTagCategory,
  ZONE_TAGS,
  TAG_CATEGORIES,
  getTag,
  getAllTags,
  getTagsByCategory,
  getTagsBySeverity,
  validateTagKeys,
  getHighestSeverity,
  createCustomTag,
} from './zoneTags';

// Spatial Index
export {
  type SpatialIndex,
  buildSpatialIndex,
  getZonesForCell,
  getZoneObjectsForCell,
  isCellInAnyZone,
  isCellInZone as isCellInZoneIndex,
  getCellsForZone,
  getZoneById,
  getAllZones,
  getAllZoneIds,
  getAllCells,
  findOverlappingZones,
  getAdjacentZones,
  updateIndexForZone,
  getIndexStats,
  createEmptyIndex,
} from './spatialIndex';

// Cell State (Derived Truth)
export {
  type RiskLevel,
  type H3CellState,
  type CellMetrics,
  deriveCellState,
  batchDeriveCellStates,
  deriveZoneCellStates,
  filterByRiskLevel,
  filterByTags,
  filterInZone,
  filterNotInZone,
  groupByRiskLevel,
  aggregateTags,
  createEmptyCellState,
  withMetrics,
  hasAlerts,
  hasWarnings,
} from './cellState';

// Geofencing
export {
  type GeoEventType,
  type GeoEvent,
  type EntityPositionUpdate,
  GeofencingEngine,
  detectZoneChanges,
  crossesZoneBoundary,
} from './geofencing';

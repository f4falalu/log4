/**
 * h3.ts
 *
 * H3 Canonicalization Layer.
 *
 * GOVERNANCE:
 * - Resolution is DOMAIN-FIXED (no zoom logic)
 * - No map imports
 * - No UI imports
 * - No viewport awareness
 * - Same input → same output, ALWAYS
 *
 * This is the ONLY file that computes H3 indexes.
 */

import {
  latLngToCell as h3LatLngToCell,
  cellToBoundary,
  polygonToCells as h3PolygonToCells,
  cellToLatLng,
  gridDisk,
  gridRingUnsafe,
  cellArea,
  getResolution,
  isValidCell,
} from 'h3-js';

/**
 * FIXED H3 resolution for the entire system.
 *
 * Resolution 7 characteristics:
 * - Average hex area: ~5.16 km²
 * - Average edge length: ~1.22 km
 * - Suitable for zone management at city/district level
 *
 * This value is NOT configurable at runtime.
 * Changing it requires a migration.
 */
export const H3_RESOLUTION = 7;

/**
 * Convert lat/lng to H3 cell index
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns H3 cell index at fixed resolution
 */
export function latLngToCell(lat: number, lng: number): string {
  return h3LatLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Convert a GeoJSON polygon to H3 cell indexes
 *
 * @param polygon - GeoJSON Polygon geometry
 * @returns Array of H3 cell indexes that cover the polygon
 */
export function polygonToCells(polygon: GeoJSON.Polygon): string[] {
  // h3-js expects coordinates as [lng, lat] arrays
  const coordinates = polygon.coordinates[0];

  // Convert to h3-js format (array of [lat, lng] pairs)
  const h3Polygon = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

  return h3PolygonToCells(h3Polygon, H3_RESOLUTION, true);
}

/**
 * Convert H3 cell index to GeoJSON Polygon
 *
 * @param h3Index - H3 cell index
 * @returns GeoJSON Polygon geometry
 */
export function cellToPolygon(h3Index: string): GeoJSON.Polygon {
  const boundary = cellToBoundary(h3Index, true); // GeoJSON format

  // cellToBoundary returns [lng, lat] when geoJson=true
  // Close the polygon by repeating the first point
  const coordinates = [...boundary, boundary[0]];

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Convert multiple H3 cells to a GeoJSON MultiPolygon
 *
 * @param h3Indexes - Array of H3 cell indexes
 * @returns GeoJSON MultiPolygon geometry
 */
export function cellsToMultiPolygon(h3Indexes: string[]): GeoJSON.MultiPolygon {
  const polygons = h3Indexes.map((index) => cellToPolygon(index).coordinates);

  return {
    type: 'MultiPolygon',
    coordinates: polygons,
  };
}

/**
 * Get the center point of an H3 cell
 *
 * @param h3Index - H3 cell index
 * @returns [lat, lng] center coordinates
 */
export function getCellCenter(h3Index: string): [number, number] {
  return cellToLatLng(h3Index);
}

/**
 * Get cells within k rings of a center cell
 *
 * @param h3Index - Center cell
 * @param k - Number of rings
 * @returns Array of H3 cell indexes (including center)
 */
export function getCellsInRadius(h3Index: string, k: number): string[] {
  return gridDisk(h3Index, k);
}

/**
 * Get cells in the kth ring only (excluding inner rings)
 *
 * @param h3Index - Center cell
 * @param k - Ring number
 * @returns Array of H3 cell indexes in the ring
 */
export function getCellsInRing(h3Index: string, k: number): string[] {
  return gridRingUnsafe(h3Index, k);
}

/**
 * Get area of a cell in km²
 *
 * @param h3Index - H3 cell index
 * @returns Area in km²
 */
export function getCellAreaKm2(h3Index: string): number {
  return cellArea(h3Index, 'km2');
}

/**
 * Check if an H3 index is valid
 *
 * @param h3Index - H3 cell index to validate
 * @returns true if valid
 */
export function isValidH3Index(h3Index: string): boolean {
  return isValidCell(h3Index);
}

/**
 * Get the resolution of an H3 index
 *
 * @param h3Index - H3 cell index
 * @returns Resolution level (0-15)
 */
export function getCellResolution(h3Index: string): number {
  return getResolution(h3Index);
}

/**
 * Verify an H3 index is at the canonical resolution
 *
 * @param h3Index - H3 cell index
 * @returns true if at H3_RESOLUTION
 */
export function isCanonicalResolution(h3Index: string): boolean {
  return getCellResolution(h3Index) === H3_RESOLUTION;
}

/**
 * Convert GeoJSON Feature to H3 cells
 * Handles Point, Polygon, and MultiPolygon geometries
 *
 * @param feature - GeoJSON Feature
 * @returns Array of H3 cell indexes
 */
export function featureToCells(feature: GeoJSON.Feature): string[] {
  const { geometry } = feature;

  switch (geometry.type) {
    case 'Point': {
      const [lng, lat] = geometry.coordinates;
      return [latLngToCell(lat, lng)];
    }

    case 'Polygon': {
      return polygonToCells(geometry);
    }

    case 'MultiPolygon': {
      const cells = new Set<string>();
      for (const polygonCoords of geometry.coordinates) {
        const polygon: GeoJSON.Polygon = {
          type: 'Polygon',
          coordinates: polygonCoords,
        };
        polygonToCells(polygon).forEach((cell) => cells.add(cell));
      }
      return Array.from(cells);
    }

    default:
      console.warn(`[h3] Unsupported geometry type: ${geometry.type}`);
      return [];
  }
}

/**
 * Get hexagon boundary as array of [lng, lat] coordinates
 * Useful for rendering without full GeoJSON overhead
 *
 * @param h3Index - H3 cell index
 * @returns Array of [lng, lat] coordinates
 */
export function getCellBoundaryCoords(h3Index: string): [number, number][] {
  const boundary = cellToBoundary(h3Index, true);
  return boundary as [number, number][];
}

/**
 * Batch convert lat/lng points to cells
 * Optimized for bulk operations
 *
 * @param points - Array of {lat, lng} objects
 * @returns Array of H3 cell indexes (same order as input)
 */
export function batchLatLngToCells(
  points: Array<{ lat: number; lng: number }>
): string[] {
  return points.map((p) => latLngToCell(p.lat, p.lng));
}

/**
 * Deduplicate H3 cell array
 *
 * @param cells - Array of H3 cell indexes (may have duplicates)
 * @returns Deduplicated array
 */
export function deduplicateCells(cells: string[]): string[] {
  return Array.from(new Set(cells));
}

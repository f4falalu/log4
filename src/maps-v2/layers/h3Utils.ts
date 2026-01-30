/**
 * h3Utils.ts — Pure H3 math utilities.
 *
 * No MapLibre imports. No React imports. No side effects.
 * Resolution 7 is the ONLY resolution used in this system.
 */

import {
  latLngToCell,
  cellToBoundary,
  cellToLatLng,
  polygonToCells,
  isValidCell,
  getResolution,
} from 'h3-js';

export const H3_RESOLUTION = 7;

/**
 * Convert lat/lng to H3 cell at resolution 7.
 */
export function latLngToH3(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Convert an H3 cell index to a GeoJSON Polygon.
 * Returns coordinates in [lng, lat] order (GeoJSON standard).
 */
export function cellToPolygon(h3Index: string): GeoJSON.Polygon {
  const boundary = cellToBoundary(h3Index);
  // cellToBoundary returns [lat, lng] — flip to [lng, lat] for GeoJSON
  const coords = boundary.map(([lat, lng]) => [lng, lat] as [number, number]);
  // Close the polygon
  coords.push(coords[0]);
  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

/**
 * Convert a GeoJSON Polygon to H3 cells at resolution 7.
 */
export function polygonToH3Cells(polygon: GeoJSON.Polygon): string[] {
  // h3-js polygonToCells expects [lat, lng] arrays
  const ring = polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
  return polygonToCells(ring, H3_RESOLUTION, true);
}

/**
 * Get the center of an H3 cell as [lng, lat].
 */
export function getCellCenter(h3Index: string): [number, number] {
  const [lat, lng] = cellToLatLng(h3Index);
  return [lng, lat];
}

/**
 * Validate that an H3 index is valid and at resolution 7.
 */
export function isValidH3Cell(h3Index: string): boolean {
  return isValidCell(h3Index) && getResolution(h3Index) === H3_RESOLUTION;
}

/**
 * Convert a set of H3CellState objects to a GeoJSON FeatureCollection.
 */
export function cellStatesToFeatureCollection(
  cells: Array<{
    h3Index: string;
    effectiveRiskScore: number;
    confidence: number;
    zoneIds: string[];
  }>,
  selectedIndexes?: Set<string>,
  hoveredIndex?: string | null
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = cells.map((cell) => {
    const polygon = cellToPolygon(cell.h3Index);
    return {
      type: 'Feature',
      geometry: polygon,
      properties: {
        h3Index: cell.h3Index,
        riskScore: cell.effectiveRiskScore,
        confidence: cell.confidence,
        zoneCount: cell.zoneIds.length,
        isSelected: selectedIndexes?.has(cell.h3Index) ?? false,
        isHovered: cell.h3Index === hoveredIndex,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Compute bounding box for a set of H3 cells.
 * Returns [sw, ne] for MapLibre fitBounds.
 */
export function getCellBounds(h3Indexes: string[]): [[number, number], [number, number]] | null {
  if (h3Indexes.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const h3Index of h3Indexes) {
    const boundary = cellToBoundary(h3Index);
    for (const [lat, lng] of boundary) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Convert a set of click points (in [lng, lat]) to a closed polygon.
 */
export function pointsToPolygon(points: [number, number][]): GeoJSON.Polygon | null {
  if (points.length < 3) return null;
  const coords = [...points, points[0]]; // close the ring
  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

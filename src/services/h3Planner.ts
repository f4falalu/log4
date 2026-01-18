import * as h3 from 'h3-js';
import type { PlanningCell, FacilityPlanningProjection, WarehouseCoverage } from '@/models/planning';

/**
 * Generate an H3 index for a given latitude/longitude at a specific resolution.
 */
export function generateCell(resolution: number, lat: number, lng: number): string {
    return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Convert an H3 index to a GeoJSON Polygon.
 */
export function cellToPolygon(h3Index: string): GeoJSON.Polygon {
    const boundary = h3.cellToBoundary(h3Index, true); // true => GeoJSON order [lng, lat]
    // Ensure polygon is closed by repeating first coordinate
    const closed = [...boundary, boundary[0]];
    return {
        type: 'Polygon',
        coordinates: [closed],
    } as GeoJSON.Polygon;
}

/**
 * Aggregate raw delivery data into PlanningCell metrics.
 * This is a placeholder implementation – replace `RawDelivery` with your actual type.
 */
export function aggregateMetrics(
    cells: PlanningCell[],
    rawDeliveries: any[] // TODO: replace with proper type
): PlanningCell[] {
    // Simple aggregation: count deliveries per cell
    const deliveryMap: Record<string, number> = {};
    rawDeliveries.forEach((d) => {
        const { lat, lng, demand } = d;
        const index = generateCell(8, lat, lng); // default resolution 8 for aggregation
        deliveryMap[index] = (deliveryMap[index] ?? 0) + (demand ?? 1);
    });

    return cells.map((cell) => {
        const deliveries = deliveryMap[cell.h3Index] ?? 0;
        const newMetrics = {
            ...cell.metrics,
            deliveries,
            demand: deliveries, // for demo we treat demand same as deliveries
        };
        return { ...cell, metrics: newMetrics };
    });
}

/**
 * Compute the k‑ring coverage indexes for a warehouse.
 */
export function kRingCoverage(
    warehouse: { lat: number; lng: number },
    resolution: number,
    radius: number
): string[] {
    const centerIndex = generateCell(resolution, warehouse.lat, warehouse.lng);
    // radius is number of hexagons outward; use h3.gridDisk
    return h3.gridDisk(centerIndex, radius);
}

/**
 * Map MapLibre zoom level to an appropriate H3 resolution.
 * This mapping can be tuned; currently uses a simple step function.
 */
export function resolutionForZoom(zoom: number): number {
    if (zoom >= 12) return 10;
    if (zoom >= 10) return 9;
    if (zoom >= 8) return 8;
    return 7;
}

/**
 * Map zoom level to H3 resolution with finer granularity.
 * Provides more resolution steps for planning visualization.
 *
 * H3 Resolution Reference (approximate cell areas):
 * - Res 4: ~1,770 km² (country/region view)
 * - Res 5: ~253 km² (state/province view)
 * - Res 6: ~36 km² (metro area view)
 * - Res 7: ~5 km² (city view)
 * - Res 8: ~0.74 km² (neighborhood view)
 * - Res 9: ~0.1 km² (street view)
 */
export function resolutionForZoomPrecise(zoom: number): number {
    if (zoom >= 14) return 9;  // Street level - small hexagons
    if (zoom >= 12) return 8;  // Neighborhood level
    if (zoom >= 10) return 7;  // City level
    if (zoom >= 8) return 6;   // Metro area level
    if (zoom >= 6) return 5;   // State/province level
    if (zoom >= 4) return 4;   // Country/region level
    return 3;                  // Continent level
}

/**
 * Viewport bounds interface for H3 cell enumeration.
 */
export interface ViewportBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

/**
 * Get all H3 cells that cover a viewport bounding box.
 * Uses h3.polygonToCells for proper enumeration (no duplicates, handles edges correctly).
 */
export function getViewportCells(bounds: ViewportBounds, resolution: number): string[] {
    // Validate bounds
    if (!bounds ||
        typeof bounds.north !== 'number' ||
        typeof bounds.south !== 'number' ||
        typeof bounds.east !== 'number' ||
        typeof bounds.west !== 'number') {
        console.warn('[h3Planner] Invalid bounds provided to getViewportCells');
        return [];
    }

    // Clamp resolution to valid H3 range (0-15)
    const clampedResolution = Math.max(0, Math.min(15, Math.floor(resolution)));

    try {
        // Create polygon ring from bounds [lat, lng] for h3-js
        // Note: h3.polygonToCells expects [lat, lng] order by default
        const polygon: [number, number][] = [
            [bounds.north, bounds.west],
            [bounds.north, bounds.east],
            [bounds.south, bounds.east],
            [bounds.south, bounds.west],
            [bounds.north, bounds.west], // Close the ring
        ];

        // polygonToCells returns all H3 indexes whose centers are within the polygon
        const cells = h3.polygonToCells(polygon, clampedResolution, false);

        console.log('[h3Planner] getViewportCells:', {
            bounds: { n: bounds.north.toFixed(2), s: bounds.south.toFixed(2), e: bounds.east.toFixed(2), w: bounds.west.toFixed(2) },
            resolution: clampedResolution,
            cellCount: cells.length,
        });

        return cells;
    } catch (error) {
        console.error('[h3Planner] Error in getViewportCells:', error);
        return [];
    }
}

/**
 * Batch convert H3 indexes to GeoJSON polygons.
 * Returns a Map for efficient lookup.
 */
export function cellsToBoundaries(h3Indexes: string[]): Map<string, GeoJSON.Polygon> {
    const boundaries = new Map<string, GeoJSON.Polygon>();
    for (const index of h3Indexes) {
        boundaries.set(index, cellToPolygon(index));
    }
    return boundaries;
}

/**
 * Get parent cell at a coarser resolution.
 */
export function getParentCell(h3Index: string, parentResolution: number): string {
    return h3.cellToParent(h3Index, parentResolution);
}

/**
 * Get child cells at a finer resolution.
 */
export function getChildCells(h3Index: string, childResolution: number): string[] {
    return h3.cellToChildren(h3Index, childResolution);
}

/**
 * Check if two H3 cells are neighbors (share an edge).
 */
export function areCellsNeighbors(cellA: string, cellB: string): boolean {
    return h3.areNeighborCells(cellA, cellB);
}

/**
 * Get the resolution of an H3 index.
 */
export function getCellResolution(h3Index: string): number {
    return h3.getResolution(h3Index);
}

/**
 * CoverageEngine.ts — Computes facility coverage rings and H3 cell coverage.
 *
 * Produces concentric rings (5km, 10km, 15km) from each facility
 * and identifies covered/uncovered H3 cells.
 *
 * Pure computation. No MapLibre. No side effects.
 */

import type { FacilityCoverage, CoverageRing } from '../contracts/PlanningTypes';
import { getCellsInRadius } from '../../map/core/spatial';

/** Coverage ring radii in km */
const COVERAGE_RADII_KM = [5, 10, 15];

/** H3 resolution for coverage computation */
const H3_RESOLUTION = 7;

export interface FacilityInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Compute coverage rings for a set of facilities.
 */
export function computeFacilityCoverage(facilities: FacilityInput[]): FacilityCoverage[] {
  return facilities.map((facility) => {
    const rings: CoverageRing[] = COVERAGE_RADII_KM.map((radiusKm) => {
      const h3Cells = getCellsInRadius(facility.lat, facility.lng, radiusKm);
      return {
        facilityId: facility.id,
        radiusKm,
        h3Cells,
      };
    });

    // Total unique cells across all rings
    const allCells = new Set<string>();
    rings.forEach((ring) => ring.h3Cells.forEach((c) => allCells.add(c)));

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      rings,
      totalCellsCovered: allCells.size,
    };
  });
}

/**
 * Get all unique H3 cells covered by any facility at any radius.
 */
export function getAllCoveredCells(coverages: FacilityCoverage[]): Set<string> {
  const covered = new Set<string>();
  coverages.forEach((fc) => {
    fc.rings.forEach((ring) => {
      ring.h3Cells.forEach((c) => covered.add(c));
    });
  });
  return covered;
}

/**
 * Generate GeoJSON circles for coverage ring visualization.
 * Returns a FeatureCollection of polygon circles.
 */
export function generateCoverageRingGeoJSON(
  facilities: FacilityInput[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  facilities.forEach((facility) => {
    COVERAGE_RADII_KM.forEach((radiusKm, index) => {
      // Generate a circle polygon (64 vertices)
      const circle = generateCirclePolygon(facility.lng, facility.lat, radiusKm, 64);
      features.push({
        type: 'Feature',
        properties: {
          facilityId: facility.id,
          facilityName: facility.name,
          radiusKm,
          ringIndex: index,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circle],
        },
      });
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Generate a circle polygon as an array of [lng, lat] coordinates.
 */
function generateCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  segments: number
): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const latRad = (centerLat * Math.PI) / 180;
    const lngRad = (centerLng * Math.PI) / 180;
    const d = radiusKm / earthRadiusKm;

    const lat = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(angle)
    );
    const lng = lngRad + Math.atan2(
      Math.sin(angle) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(lat)
    );

    coords.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return coords;
}

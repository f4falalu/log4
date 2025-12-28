/**
 * Geofabrik OSM Boundaries Library
 *
 * This library handles downloading and parsing OpenStreetMap administrative
 * boundaries from Geofabrik extracts.
 *
 * Geofabrik provides free daily extracts of OSM data in PBF format.
 * We use this instead of Overpass API to avoid server overhead and rate limits.
 *
 * Architecture:
 * 1. Download PBF extract for region (e.g., Nigeria) from Geofabrik
 * 2. Parse PBF to extract admin boundaries (relations with admin_level tag)
 * 3. Convert OSM geometry to GeoJSON
 * 4. Store in admin_units table with proper hierarchy
 *
 * @see https://download.geofabrik.de/
 */

export interface GeofabrikRegion {
  id: string;
  name: string;
  parent?: string;
  pbfUrl: string;
  geoJsonUrl?: string;
  isoCode?: string;
}

/**
 * Geofabrik regions catalog for Africa
 * Nigeria is under africa/nigeria
 */
export const GEOFABRIK_REGIONS: Record<string, GeofabrikRegion> = {
  nigeria: {
    id: 'nigeria',
    name: 'Nigeria',
    parent: 'africa',
    pbfUrl: 'https://download.geofabrik.de/africa/nigeria-latest.osm.pbf',
    geoJsonUrl: 'https://download.geofabrik.de/africa/nigeria-latest.geojson',
    isoCode: 'NG',
  },
  africa: {
    id: 'africa',
    name: 'Africa',
    pbfUrl: 'https://download.geofabrik.de/africa-latest.osm.pbf',
  },
};

/**
 * OSM admin_level mapping for Nigeria
 * @see https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative#10_admin_level_values_for_specific_countries
 */
export const NIGERIA_ADMIN_LEVELS = {
  COUNTRY: 2,      // Nigeria
  REGION: 3,       // Geo-political zones (not commonly used)
  STATE: 4,        // States (36 states + FCT)
  LGA: 6,          // Local Government Areas
  WARD: 8,         // Wards
  COMMUNITY: 10,   // Communities/Villages
} as const;

export interface AdminBoundary {
  osmId: string;
  osmType: 'relation' | 'way' | 'node';
  adminLevel: number;
  name: string;
  nameEn?: string;
  nameLocal?: string;
  parentOsmId?: string;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  center?: { lat: number; lng: number };
  bounds?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  tags: Record<string, string>;
  population?: number;
  areaKm2?: number;
}

export interface BoundaryImportProgress {
  status: 'downloading' | 'parsing' | 'importing' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  totalBoundaries?: number;
  importedBoundaries?: number;
  error?: string;
}

export type BoundaryImportCallback = (progress: BoundaryImportProgress) => void;

/**
 * Download Geofabrik PBF extract for a region
 *
 * Note: PBF files are binary and can be large (Nigeria is ~300MB).
 * This should be run in a background job or Edge Function.
 *
 * @param region - Geofabrik region identifier
 * @returns ArrayBuffer containing PBF data
 */
export async function downloadGeofabrikPBF(
  region: keyof typeof GEOFABRIK_REGIONS,
  onProgress?: BoundaryImportCallback
): Promise<ArrayBuffer> {
  const regionConfig = GEOFABRIK_REGIONS[region];

  if (!regionConfig) {
    throw new Error(`Unknown Geofabrik region: ${region}`);
  }

  onProgress?.({
    status: 'downloading',
    message: `Downloading ${regionConfig.name} OSM data from Geofabrik...`,
    progress: 0,
  });

  try {
    const response = await fetch(regionConfig.pbfUrl);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      const progressPercent = totalBytes > 0
        ? Math.round((receivedBytes / totalBytes) * 100)
        : 0;

      onProgress?.({
        status: 'downloading',
        message: `Downloading ${regionConfig.name}... ${Math.round(receivedBytes / 1024 / 1024)}MB`,
        progress: progressPercent,
      });
    }

    // Combine chunks into single ArrayBuffer
    const allChunks = new Uint8Array(receivedBytes);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    onProgress?.({
      status: 'downloading',
      message: `Download complete: ${Math.round(receivedBytes / 1024 / 1024)}MB`,
      progress: 100,
    });

    return allChunks.buffer;
  } catch (error) {
    onProgress?.({
      status: 'error',
      message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Parse PBF data to extract admin boundaries
 *
 * This requires a PBF parser library. We'll use osmtogeojson which can work
 * with pre-filtered OSM data.
 *
 * For production use, this should run in a Supabase Edge Function or background job.
 *
 * @param pbfData - PBF ArrayBuffer from Geofabrik
 * @param adminLevels - Which admin levels to extract (e.g., [4, 6] for States and LGAs)
 * @returns Array of admin boundaries
 */
export async function parsePBFBoundaries(
  pbfData: ArrayBuffer,
  adminLevels: number[] = [4, 6, 8], // States, LGAs, Wards
  onProgress?: BoundaryImportCallback
): Promise<AdminBoundary[]> {
  onProgress?.({
    status: 'parsing',
    message: 'Parsing OSM PBF data...',
    progress: 0,
  });

  try {
    // Note: Actual PBF parsing would use a library like osm-pbf-parser
    // or we could use the GeoJSON export from Geofabrik instead
    // For now, this is a placeholder that would be implemented with the actual library

    throw new Error('PBF parsing not yet implemented - use GeoJSON endpoint instead');
  } catch (error) {
    onProgress?.({
      status: 'error',
      message: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Download and parse GeoJSON export from Geofabrik
 *
 * This is simpler than PBF parsing but the files are larger.
 * GeoJSON extracts are updated daily like PBF.
 *
 * @param region - Geofabrik region identifier
 * @param adminLevels - Which admin levels to extract
 * @returns Array of admin boundaries
 */
export async function downloadGeofabrikGeoJSON(
  region: keyof typeof GEOFABRIK_REGIONS,
  adminLevels: number[] = [4, 6, 8],
  onProgress?: BoundaryImportCallback
): Promise<AdminBoundary[]> {
  const regionConfig = GEOFABRIK_REGIONS[region];

  if (!regionConfig?.geoJsonUrl) {
    throw new Error(`GeoJSON not available for region: ${region}`);
  }

  onProgress?.({
    status: 'downloading',
    message: `Downloading ${regionConfig.name} GeoJSON from Geofabrik...`,
    progress: 10,
  });

  try {
    const response = await fetch(regionConfig.geoJsonUrl);

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    onProgress?.({
      status: 'parsing',
      message: 'Parsing GeoJSON data...',
      progress: 50,
    });

    const geojson = await response.json() as GeoJSON.FeatureCollection;

    // Filter features for admin boundaries
    const boundaries: AdminBoundary[] = [];

    for (const feature of geojson.features) {
      const props = feature.properties || {};
      const adminLevel = parseInt(props.admin_level || '0', 10);

      // Only include requested admin levels and proper boundaries
      if (
        adminLevels.includes(adminLevel) &&
        props.boundary === 'administrative' &&
        props.name
      ) {
        // Convert geometry to appropriate type
        let geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;

        if (feature.geometry.type === 'Polygon') {
          geometry = feature.geometry as GeoJSON.Polygon;
        } else if (feature.geometry.type === 'MultiPolygon') {
          geometry = feature.geometry as GeoJSON.MultiPolygon;
        } else {
          continue; // Skip non-polygon geometries
        }

        // Calculate center point (centroid)
        const center = calculateCentroid(geometry);

        // Calculate bounding box
        const bounds = calculateBounds(geometry);

        boundaries.push({
          osmId: props.id || props['@id'] || feature.id?.toString() || '',
          osmType: props['@type'] || 'relation',
          adminLevel,
          name: props.name,
          nameEn: props['name:en'],
          nameLocal: props['name:local'] || props['name:ha'], // Hausa for Northern Nigeria
          parentOsmId: props['is_in'] || undefined,
          geometry,
          center,
          bounds,
          tags: props,
          population: parseInt(props.population || '0', 10) || undefined,
        });
      }
    }

    onProgress?.({
      status: 'parsing',
      message: `Parsed ${boundaries.length} admin boundaries`,
      progress: 90,
      totalBoundaries: boundaries.length,
    });

    return boundaries;
  } catch (error) {
    onProgress?.({
      status: 'error',
      message: `Failed to process GeoJSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Calculate centroid of a polygon or multipolygon
 */
function calculateCentroid(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): { lat: number; lng: number } {
  let totalLat = 0;
  let totalLng = 0;
  let pointCount = 0;

  const processRing = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      totalLng += lng;
      totalLat += lat;
      pointCount++;
    }
  };

  if (geometry.type === 'Polygon') {
    processRing(geometry.coordinates[0]);
  } else {
    for (const polygon of geometry.coordinates) {
      processRing(polygon[0]);
    }
  }

  return {
    lat: totalLat / pointCount,
    lng: totalLng / pointCount,
  };
}

/**
 * Calculate bounding box of a polygon or multipolygon
 */
function calculateBounds(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  const processRing = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  };

  if (geometry.type === 'Polygon') {
    processRing(geometry.coordinates[0]);
  } else {
    for (const polygon of geometry.coordinates) {
      processRing(polygon[0]);
    }
  }

  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Build hierarchical parent-child relationships
 *
 * Uses spatial containment to determine parent-child relationships
 * when OSM tags don't provide explicit parent information.
 */
export function buildBoundaryHierarchy(boundaries: AdminBoundary[]): AdminBoundary[] {
  // Sort by admin_level (lower levels first, e.g., State before LGA)
  const sorted = [...boundaries].sort((a, b) => a.adminLevel - b.adminLevel);

  // TODO: Implement spatial containment checks using turf.js or similar
  // For each boundary, find the smallest boundary that contains it at a higher level

  return sorted;
}

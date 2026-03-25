/**
 * Overpass API Boundary Import
 *
 * Fetches OSM administrative boundaries via the Overpass API.
 * Supports any country by ISO code. Returns simplified boundary
 * data (names + metadata) for storage in admin_units table.
 *
 * We fetch names/metadata only (not full geometry) to keep payloads small
 * and avoid Overpass timeouts. Full geometry can be fetched per-boundary
 * on demand if needed.
 */

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export interface BoundaryResult {
  osmId: number;
  name: string;
  nameEn?: string;
  adminLevel: number;
  isoCode?: string;
  parentName?: string;
  population?: number;
  center?: { lat: number; lng: number };
  tags: Record<string, string>;
}

export interface ImportProgress {
  status: 'idle' | 'fetching' | 'parsing' | 'saving' | 'complete' | 'error';
  message: string;
  progress: number;
  total?: number;
  imported?: number;
  error?: string;
}

/**
 * Known admin_level mappings per country.
 * admin_level varies by country — see OSM wiki for details.
 */
export const COUNTRY_ADMIN_LEVELS: Record<string, { states: number; districts: number; label_states: string; label_districts: string }> = {
  NG: { states: 4, districts: 6, label_states: 'States', label_districts: 'LGAs' },
  GH: { states: 4, districts: 6, label_states: 'Regions', label_districts: 'Districts' },
  KE: { states: 4, districts: 6, label_states: 'Counties', label_districts: 'Sub-Counties' },
  TZ: { states: 4, districts: 6, label_states: 'Regions', label_districts: 'Districts' },
  UG: { states: 4, districts: 5, label_states: 'Regions', label_districts: 'Districts' },
  ZA: { states: 4, districts: 6, label_states: 'Provinces', label_districts: 'Municipalities' },
  ET: { states: 4, districts: 6, label_states: 'Regions', label_districts: 'Zones' },
  RW: { states: 4, districts: 6, label_states: 'Provinces', label_districts: 'Districts' },
  IN: { states: 4, districts: 5, label_states: 'States', label_districts: 'Districts' },
  PK: { states: 4, districts: 6, label_states: 'Provinces', label_districts: 'Districts' },
};

/**
 * Build an Overpass QL query for admin boundaries of a country.
 *
 * @param isoCode - ISO 3166-1 alpha-2 country code (e.g. "NG")
 * @param adminLevels - Array of admin_level values to fetch
 * @param timeout - Query timeout in seconds
 */
function buildOverpassQuery(isoCode: string, adminLevels: number[], timeout = 120): string {
  const levelFilter = adminLevels.map((l) => `["admin_level"="${l}"]`).join('');

  // Use area query to scope to the country
  // 3600000000 + relation id offset for areas in Overpass
  return `
[out:json][timeout:${timeout}];
area["ISO3166-1"="${isoCode}"]->.country;
(
  relation(area.country)["boundary"="administrative"]${adminLevels.length === 1 ? levelFilter : ''};
);
${adminLevels.length > 1 ? `// filter by admin_level done client-side` : ''}
out center tags;
`.trim();
}

/**
 * Fetch admin boundaries from Overpass API for a given country.
 *
 * @param isoCode - ISO 3166-1 alpha-2 code (e.g. "NG", "GH", "KE")
 * @param adminLevels - Which admin levels to import (e.g. [4, 6])
 * @param onProgress - Progress callback
 */
export async function fetchBoundariesFromOverpass(
  isoCode: string,
  adminLevels: number[],
  onProgress?: (p: ImportProgress) => void
): Promise<BoundaryResult[]> {
  onProgress?.({
    status: 'fetching',
    message: `Querying Overpass API for ${isoCode} boundaries (levels ${adminLevels.join(', ')})...`,
    progress: 10,
  });

  const query = buildOverpassQuery(isoCode, adminLevels);

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Overpass API error (${response.status}): ${text.slice(0, 200)}`);
    }

    onProgress?.({
      status: 'parsing',
      message: 'Parsing boundary data...',
      progress: 60,
    });

    const json = await response.json();
    const elements: any[] = json.elements || [];

    // Filter to requested admin levels and map to our structure
    const boundaries: BoundaryResult[] = elements
      .filter((el: any) => {
        const level = parseInt(el.tags?.admin_level || '0', 10);
        return el.type === 'relation' && adminLevels.includes(level) && el.tags?.name;
      })
      .map((el: any): BoundaryResult => ({
        osmId: el.id,
        name: el.tags.name,
        nameEn: el.tags['name:en'],
        adminLevel: parseInt(el.tags.admin_level, 10),
        isoCode: el.tags['ISO3166-2'] || undefined,
        parentName: el.tags['is_in:state'] || el.tags['is_in'] || undefined,
        population: el.tags.population ? parseInt(el.tags.population, 10) : undefined,
        center: el.center ? { lat: el.center.lat, lng: el.center.lon } : undefined,
        tags: el.tags,
      }));

    onProgress?.({
      status: 'parsing',
      message: `Found ${boundaries.length} boundaries`,
      progress: 80,
      total: boundaries.length,
    });

    return boundaries;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.({
      status: 'error',
      message: `Import failed: ${msg}`,
      progress: 0,
      error: msg,
    });
    throw error;
  }
}

/**
 * Save imported boundaries to the admin_units table.
 */
export async function saveBoundariesToDB(
  supabase: any,
  boundaries: BoundaryResult[],
  countryId: string,
  workspaceId: string,
  onProgress?: (p: ImportProgress) => void
): Promise<number> {
  onProgress?.({
    status: 'saving',
    message: `Saving ${boundaries.length} boundaries to database...`,
    progress: 85,
    total: boundaries.length,
    imported: 0,
  });

  let imported = 0;
  const batchSize = 50;

  for (let i = 0; i < boundaries.length; i += batchSize) {
    const batch = boundaries.slice(i, i + batchSize);

    const rows = batch.map((b) => ({
      name: b.name,
      name_en: b.nameEn || b.name,
      admin_level: b.adminLevel,
      country_id: countryId,
      workspace_id: workspaceId,
      osm_id: b.osmId,
      osm_type: 'relation' as const,
      population: b.population || null,
      is_active: true,
      metadata: {
        iso_code: b.isoCode,
        parent_name: b.parentName,
      },
    }));

    // Insert rows, skipping any that already exist (duplicate osm_id)
    let batchImported = 0;
    for (const row of rows) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('admin_units')
        .select('id')
        .eq('osm_id', row.osm_id)
        .eq('country_id', row.country_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateErr } = await supabase
          .from('admin_units')
          .update({
            name: row.name,
            name_en: row.name_en,
            population: row.population,
            metadata: row.metadata,
          })
          .eq('id', existing.id);
        if (!updateErr) batchImported++;
      } else {
        const { error: insertErr } = await supabase
          .from('admin_units')
          .insert(row);
        if (!insertErr) batchImported++;
        else console.warn('[overpass-boundaries] Insert error:', insertErr.message);
      }
    }
    imported += batchImported;

    onProgress?.({
      status: 'saving',
      message: `Saved ${imported} of ${boundaries.length} boundaries...`,
      progress: 85 + Math.round((imported / boundaries.length) * 15),
      total: boundaries.length,
      imported,
    });
  }

  onProgress?.({
    status: 'complete',
    message: `Import complete: ${imported} boundaries saved`,
    progress: 100,
    total: boundaries.length,
    imported,
  });

  return imported;
}

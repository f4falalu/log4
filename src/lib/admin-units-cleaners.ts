/**
 * Data Cleaners for Admin Units (New Country-Based Location Model)
 *
 * These cleaners work with the admin_units table for validation and normalization.
 * They use PostgreSQL fuzzy matching via the fuzzy_match_admin_unit() function.
 *
 * For backward compatibility, the existing data-cleaners.ts continues to work
 * with the lgas table.
 */

import { supabase } from '@/integrations/supabase/client';
import type { AdminUnit } from '@/hooks/useAdminUnits';
import { DEFAULT_COUNTRY_ID } from '@/lib/constants';

export interface AdminUnitMatchResult {
  name: string;
  id: string | null;
  admin_level?: number;
  parent_id?: string | null;
  confidence: 'exact' | 'fuzzy' | 'none';
  similarity?: number; // 0.0 - 1.0
}

/**
 * Normalize and match State name against admin_units
 * Uses PostgreSQL fuzzy_match_admin_unit function with pg_trgm
 */
export async function normalizeState(
  value: any,
  countryId: string = DEFAULT_COUNTRY_ID,
  threshold: number = 0.65
): Promise<AdminUnitMatchResult> {
  const cleaned = String(value || '').trim();

  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  try {
    // Use PostgreSQL fuzzy matching function
    const { data, error } = await supabase.rpc('fuzzy_match_admin_unit', {
      p_name: cleaned,
      p_country_id: countryId,
      p_admin_level: 4, // State level in Nigeria
      p_threshold: threshold,
    });

    if (error) {
      console.error('State fuzzy match error:', error);
      return { name: cleaned, id: null, confidence: 'none' };
    }

    if (data && data.length > 0) {
      const match = data[0];
      const isExact = match.similarity >= 0.95; // 95%+ is exact match

      return {
        name: match.name,
        id: match.id,
        admin_level: match.admin_level,
        confidence: isExact ? 'exact' : 'fuzzy',
        similarity: match.similarity,
      };
    }

    return { name: cleaned, id: null, confidence: 'none' };
  } catch (error) {
    console.error('State normalization error:', error);
    return { name: cleaned, id: null, confidence: 'none' };
  }
}

/**
 * Normalize and match LGA name against admin_units
 * Optionally filter by parent State for better accuracy
 */
export async function normalizeLGAAdminUnit(
  value: any,
  stateId?: string | null,
  countryId: string = DEFAULT_COUNTRY_ID,
  threshold: number = 0.65
): Promise<AdminUnitMatchResult> {
  const cleaned = String(value || '').trim();

  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  try {
    // If we have a state, use direct query with parent filter for better performance
    if (stateId) {
      const { data, error } = await supabase
        .from('admin_units')
        .select('*')
        .eq('country_id', countryId)
        .eq('admin_level', 6) // LGA level
        .eq('parent_id', stateId)
        .ilike('name', cleaned);

      if (error) {
        console.error('LGA direct match error:', error);
      } else if (data && data.length > 0) {
        // Exact match found within the state
        return {
          name: data[0].name,
          id: data[0].id,
          admin_level: data[0].admin_level,
          parent_id: data[0].parent_id,
          confidence: 'exact',
          similarity: 1.0,
        };
      }
    }

    // Use PostgreSQL fuzzy matching function
    const { data, error } = await supabase.rpc('fuzzy_match_admin_unit', {
      p_name: cleaned,
      p_country_id: countryId,
      p_admin_level: 6, // LGA level in Nigeria
      p_threshold: threshold,
    });

    if (error) {
      console.error('LGA fuzzy match error:', error);
      return { name: cleaned, id: null, confidence: 'none' };
    }

    if (data && data.length > 0) {
      // If we have a state filter, prefer matches within that state
      let match = data[0];

      if (stateId) {
        const stateMatch = data.find((m: any) => m.parent_id === stateId);
        if (stateMatch) match = stateMatch;
      }

      const isExact = match.similarity >= 0.95; // 95%+ is exact match

      return {
        name: match.name,
        id: match.id,
        admin_level: match.admin_level,
        parent_id: match.parent_id,
        confidence: isExact ? 'exact' : 'fuzzy',
        similarity: match.similarity,
      };
    }

    return { name: cleaned, id: null, confidence: 'none' };
  } catch (error) {
    console.error('LGA normalization error:', error);
    return { name: cleaned, id: null, confidence: 'none' };
  }
}

/**
 * Reverse geocoding: Find admin unit by lat/lng coordinates
 * Uses PostGIS ST_Contains for spatial query
 */
export async function findAdminUnitByCoordinates(
  lat: number,
  lng: number,
  adminLevel?: number,
  countryId: string = DEFAULT_COUNTRY_ID
): Promise<AdminUnit | null> {
  try {
    const { data, error } = await supabase.rpc('find_admin_unit_by_point', {
      p_lat: lat,
      p_lng: lng,
      p_admin_level: adminLevel || null,
      p_country_id: countryId,
    });

    if (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0] as AdminUnit;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Batch normalize LGAs from CSV rows
 * Returns a map of original LGA name → normalized match result
 */
export async function batchNormalizeLGAs(
  lgaNames: string[],
  stateId?: string | null,
  countryId: string = DEFAULT_COUNTRY_ID,
  threshold: number = 0.65
): Promise<Map<string, AdminUnitMatchResult>> {
  const results = new Map<string, AdminUnitMatchResult>();
  const uniqueNames = [...new Set(lgaNames.filter(Boolean))];

  // Process in parallel for performance
  await Promise.all(
    uniqueNames.map(async (name) => {
      const result = await normalizeLGAAdminUnit(name, stateId, countryId, threshold);
      results.set(name, result);
    })
  );

  return results;
}

/**
 * Helper to convert admin_units match result to legacy LGA format
 * For backward compatibility with existing import code
 */
export function adminUnitToLegacyFormat(
  match: AdminUnitMatchResult
): { name: string; id: string | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  return {
    name: match.name,
    id: match.id,
    confidence: match.confidence,
  };
}

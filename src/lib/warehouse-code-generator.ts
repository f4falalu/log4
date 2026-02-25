import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Warehouse Code Generator Utility
 * Format: PSM/KAN/##/###
 * - PSM: Fixed prefix
 * - KAN: State code (Kano)
 * - ##: Zone code (derived from service_zone or sequential)
 * - ###: Sequential number
 */

// Zone code mapping
const ZONE_CODE_MAP: Record<string, string> = {
  'Central': '01',
  'Gaya': '02',
  'Danbatta': '03',
  'Gwarzo': '04',
  'Rano': '05',
};

/**
 * Generates the next warehouse code for a facility
 * @param serviceZone - The service zone of the facility
 * @returns Promise<string> - The generated warehouse code
 */
export async function generateWarehouseCode(serviceZone?: string): Promise<string> {
  try {
    const stateCode = 'KAN'; // Kano state
    const zoneCode = serviceZone && ZONE_CODE_MAP[serviceZone]
      ? ZONE_CODE_MAP[serviceZone]
      : '01';

    // Get the count of existing facilities with the same zone code to determine sequence
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('warehouse_code')
      .like('warehouse_code', `PSM/${stateCode}/${zoneCode}/%`)
      .order('warehouse_code', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching facilities for code generation:', error);
      // Fallback to a timestamp-based code if there's an error
      const timestamp = Date.now() % 1000;
      return `PSM/${stateCode}/${zoneCode}/${timestamp.toString().padStart(3, '0')}`;
    }

    let nextSequence = 1;
    if (facilities && facilities.length > 0) {
      // Extract the sequence number from the last code
      const lastCode = facilities[0].warehouse_code;
      const match = lastCode?.match(/\/(\d{3})$/);
      if (match) {
        const lastSequence = parseInt(match[1], 10);
        nextSequence = lastSequence + 1;
      }
    }

    // Format: PSM/KAN/##/###
    const sequenceStr = nextSequence.toString().padStart(3, '0');
    return `PSM/${stateCode}/${zoneCode}/${sequenceStr}`;
  } catch (error) {
    console.error('Error generating warehouse code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now() % 1000;
    return `PSM/KAN/01/${timestamp.toString().padStart(3, '0')}`;
  }
}

/**
 * Validates if a warehouse code is unique
 * @param code - The warehouse code to validate
 * @param excludeId - Optional facility ID to exclude from check (for updates)
 * @returns Promise<boolean> - True if unique, false otherwise
 */
export async function isWarehouseCodeUnique(code: string, excludeId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('facilities')
      .select('id')
      .eq('warehouse_code', code);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking warehouse code uniqueness:', error);
      return false;
    }

    return !data || data.length === 0;
  } catch (error) {
    console.error('Error validating warehouse code:', error);
    return false;
  }
}

/**
 * Parses a warehouse code into its components
 * @param code - The warehouse code to parse
 * @returns Object with prefix, state, zone, and sequence
 */
export function parseWarehouseCode(code: string): {
  prefix: string;
  state: string;
  zone: string;
  sequence: string;
  isValid: boolean;
} {
  const regex = /^(PSM)\/([A-Z]{3})\/(\d{2})\/(\d{3})$/;
  const match = code.match(regex);

  if (!match) {
    return {
      prefix: '',
      state: '',
      zone: '',
      sequence: '',
      isValid: false,
    };
  }

  return {
    prefix: match[1],
    state: match[2],
    zone: match[3],
    sequence: match[4],
    isValid: true,
  };
}

/**
 * Gets the zone name from zone code
 * @param zoneCode - The zone code (e.g., "01")
 * @returns The zone name or undefined
 */
export function getZoneNameFromCode(zoneCode: string): string | undefined {
  const entry = Object.entries(ZONE_CODE_MAP).find(([_, code]) => code === zoneCode);
  return entry ? entry[0] : undefined;
}

/**
 * Gets the zone code from zone name
 * @param zoneName - The zone name (e.g., "Central")
 * @returns The zone code or "01" as default
 */
export function getZoneCodeFromName(zoneName: string): string {
  return ZONE_CODE_MAP[zoneName] || '01';
}

/**
 * Formats a partial warehouse code for display (e.g., during input)
 * @param prefix - Usually "PSM"
 * @param state - State code (e.g., "KAN")
 * @param zone - Zone code (e.g., "01")
 * @param sequence - Sequence number
 * @returns Formatted code
 */
export function formatWarehouseCode(
  prefix: string = 'PSM',
  state: string = 'KAN',
  zone: string = '01',
  sequence?: number
): string {
  const sequenceStr = sequence ? sequence.toString().padStart(3, '0') : '___';
  return `${prefix}/${state}/${zone}/${sequenceStr}`;
}

/**
 * Batch generates warehouse codes for multiple facilities
 * Optimized for bulk imports - queries DB once per zone instead of per facility
 * @param facilities - Array of facilities with service_zone and originalIndex
 * @param client - Supabase client instance
 * @returns Promise<Map<number, string>> - Map of facility index to generated warehouse code
 */
export async function batchGenerateWarehouseCodes(
  facilities: Array<{ service_zone?: string; originalIndex: number }>,
  client: SupabaseClient = supabase
): Promise<Map<number, string>> {
  const codeMap = new Map<number, string>();
  const stateCode = 'KAN';

  // Group facilities by zone to minimize DB queries
  const zoneGroups = new Map<string, Array<{ service_zone?: string; originalIndex: number }>>();

  facilities.forEach((facility) => {
    const zoneCode = facility.service_zone && ZONE_CODE_MAP[facility.service_zone]
      ? ZONE_CODE_MAP[facility.service_zone]
      : '01';

    if (!zoneGroups.has(zoneCode)) {
      zoneGroups.set(zoneCode, []);
    }
    zoneGroups.get(zoneCode)!.push(facility);
  });

  // Process each zone group
  for (const [zoneCode, group] of zoneGroups.entries()) {
    try {
      // Single query per zone to get the last sequence number
      const { data, error } = await client
        .from('facilities')
        .select('warehouse_code')
        .like('warehouse_code', `PSM/${stateCode}/${zoneCode}/%`)
        .order('warehouse_code', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`Error fetching facilities for zone ${zoneCode}:`, error);
        // Use timestamp-based fallback for this zone
        group.forEach((facility, index) => {
          const timestamp = Date.now() % 1000 + index;
          codeMap.set(
            facility.originalIndex,
            `PSM/${stateCode}/${zoneCode}/${timestamp.toString().padStart(3, '0')}`
          );
        });
        continue;
      }

      // Extract last sequence number
      let sequence = 0;
      if (data && data.length > 0) {
        const lastCode = data[0].warehouse_code;
        const match = lastCode?.match(/\/(\d{3})$/);
        if (match) {
          sequence = parseInt(match[1], 10);
        }
      }

      // Generate codes sequentially in-memory (fast)
      group.forEach((facility) => {
        sequence++;
        const sequenceStr = sequence.toString().padStart(3, '0');
        codeMap.set(facility.originalIndex, `PSM/${stateCode}/${zoneCode}/${sequenceStr}`);
      });
    } catch (error) {
      console.error(`Error generating codes for zone ${zoneCode}:`, error);
      // Fallback for this zone
      group.forEach((facility, index) => {
        const timestamp = Date.now() % 1000 + index;
        codeMap.set(
          facility.originalIndex,
          `PSM/${stateCode}/${zoneCode}/${timestamp.toString().padStart(3, '0')}`
        );
      });
    }
  }

  return codeMap;
}

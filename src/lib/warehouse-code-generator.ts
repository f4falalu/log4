import { supabase } from '@/integrations/supabase/client';

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

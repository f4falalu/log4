/**
 * Data cleaning and normalization utilities for CSV import
 * Handles whitespace, casing, punctuation, and standardization
 */

import type { Zone } from '@/types/zones';
import type { LGA } from '@/hooks/useLGAs';
import type { FacilityType } from '@/hooks/useFacilityTypes';
import type { LevelOfCare } from '@/hooks/useLevelsOfCare';
import { fuzzyMatch } from './fuzzy-match';

/**
 * Database tables interface for normalization
 */
export interface DBTables {
  zones: Zone[];
  lgas: LGA[];
  facilityTypes: FacilityType[];
  levelsOfCare: LevelOfCare[];
}

/**
 * Clean text: trim, normalize whitespace, remove trailing punctuation, strip quotes
 */
export function cleanText(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  return str
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[.,;:]+$/, '') // Strip trailing punctuation
    .replace(/^["'`]+|["'`]+$/g, ''); // Strip surrounding quotes
}

/**
 * Normalize to title case (capitalize first letter of each word)
 */
export function toTitleCase(value: string): string {
  if (!value) return '';

  return value
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize LGA name and match against database
 * Returns normalized LGA name or null if no match found
 */
export function normalizeLGA(
  value: any,
  lgas: LGA[]
): { name: string; id: string | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  // Title case for consistency
  const normalized = toTitleCase(cleaned);

  // Try fuzzy match against DB (threshold lowered to 65% for better matching)
  const match = fuzzyMatch(normalized, lgas, 0.65, (lga) => lga.name);

  if (match?.isExact) {
    return { name: match.match.name, id: match.match.id, confidence: 'exact' };
  } else if (match) {
    return { name: match.match.name, id: match.match.id, confidence: 'fuzzy' };
  }

  // Return cleaned value even if no DB match
  return { name: normalized, id: null, confidence: 'none' };
}

/**
 * Normalize zone/service zone and match against database
 */
export function normalizeZone(
  value: any,
  zones: Zone[]
): { name: string; id: string | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  // Title case for consistency
  const normalized = toTitleCase(cleaned);

  // Try fuzzy match against DB
  const match = fuzzyMatch(normalized, zones, 0.75, (zone) => zone.name);

  if (match?.isExact) {
    return { name: match.match.name, id: match.match.id, confidence: 'exact' };
  } else if (match) {
    return { name: match.match.name, id: match.match.id, confidence: 'fuzzy' };
  }

  // Return cleaned value even if no DB match
  return { name: normalized, id: null, confidence: 'none' };
}

/**
 * Normalize facility type and match against database
 */
export function normalizeFacilityType(
  value: any,
  facilityTypes: FacilityType[]
): { name: string; id: string | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  // Title case for consistency
  const normalized = toTitleCase(cleaned);

  // Try fuzzy match against DB
  const match = fuzzyMatch(normalized, facilityTypes, 0.75, (type) => type.name);

  if (match?.isExact) {
    return { name: match.match.name, id: match.match.id, confidence: 'exact' };
  } else if (match) {
    return { name: match.match.name, id: match.match.id, confidence: 'fuzzy' };
  }

  // Return cleaned value even if no DB match
  return { name: normalized, id: null, confidence: 'none' };
}

/**
 * Normalize level of care and match against database
 */
export function normalizeLevelOfCare(
  value: any,
  levelsOfCare: LevelOfCare[]
): { name: string; id: string | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return { name: '', id: null, confidence: 'none' };
  }

  // Title case for consistency (Primary, Secondary, Tertiary)
  const normalized = toTitleCase(cleaned);

  // Try fuzzy match against DB
  const match = fuzzyMatch(normalized, levelsOfCare, 0.75, (level) => level.name);

  if (match?.isExact) {
    return { name: match.match.name, id: match.match.id, confidence: 'exact' };
  } else if (match) {
    return { name: match.match.name, id: match.match.id, confidence: 'fuzzy' };
  }

  // Return cleaned value even if no DB match
  return { name: normalized, id: null, confidence: 'none' };
}

/**
 * Clean and normalize a phone number
 */
export function cleanPhoneNumber(value: any): string {
  if (!value) return '';

  const str = String(value);

  // Remove all non-digit characters except leading +
  let cleaned = str.replace(/[^\d+]/g, '');

  // Ensure + is only at the beginning
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  return cleaned;
}

/**
 * Clean and normalize an email address
 */
export function cleanEmail(value: any): string {
  if (!value) return '';

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ''); // Remove all whitespace
}

/**
 * Clean and normalize a numeric value
 */
export function cleanNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));

  return isNaN(num) ? null : num;
}

/**
 * Clean and normalize a warehouse code
 */
export function cleanWarehouseCode(value: any): string {
  if (!value) return '';

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ''); // Remove all whitespace
}

/**
 * Normalize result interface
 */
export interface NormalizedRow {
  original: Record<string, any>;
  normalized: Record<string, any>;
  dbMatches: {
    lga?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    zone?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    facilityType?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    levelOfCare?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
  };
}

/**
 * Clean and normalize an entire facility row
 * @param row - The raw CSV row data
 * @param dbTables - Database reference tables for matching
 * @returns Normalized row with DB match metadata
 */
export function cleanFacilityRow(
  row: Record<string, any>,
  dbTables: DBTables
): NormalizedRow {
  // Clean basic text fields
  const normalized: Record<string, any> = {
    name: cleanText(row.name),
    address: cleanText(row.address),
    ward: cleanText(row.ward),
    state: cleanText(row.state),
    contact_name_pharmacy: cleanText(row.contact_name_pharmacy),
    designation: cleanText(row.designation),
    contactPerson: cleanText(row.contactPerson),
  };

  // Clean and normalize LGA with DB matching
  const lgaResult = normalizeLGA(row.lga, dbTables.lgas);
  normalized.lga = lgaResult.name;
  const lgaMatch = { id: lgaResult.id, confidence: lgaResult.confidence };

  // Clean and normalize zone with DB matching
  const zoneResult = normalizeZone(row.service_zone, dbTables.zones);
  normalized.service_zone = zoneResult.name;
  const zoneMatch = { id: zoneResult.id, confidence: zoneResult.confidence };

  // Clean and normalize facility type with DB matching
  const typeResult = normalizeFacilityType(row.type, dbTables.facilityTypes);
  normalized.type = typeResult.name;
  const facilityTypeMatch = { id: typeResult.id, confidence: typeResult.confidence };

  // Clean and normalize level of care with DB matching
  const levelResult = normalizeLevelOfCare(row.level_of_care, dbTables.levelsOfCare);
  normalized.level_of_care = levelResult.name;
  const levelOfCareMatch = { id: levelResult.id, confidence: levelResult.confidence };

  // Clean contact fields
  normalized.email = cleanEmail(row.email);
  normalized.phone = cleanPhoneNumber(row.phone);
  normalized.phone_pharmacy = cleanPhoneNumber(row.phone_pharmacy);

  // Clean numeric fields
  normalized.latitude = cleanNumber(row.latitude);
  normalized.longitude = cleanNumber(row.longitude);
  normalized.storage_capacity = cleanNumber(row.storage_capacity);
  normalized.capacity = cleanNumber(row.capacity);

  // Clean warehouse code
  normalized.warehouse_code = cleanWarehouseCode(row.warehouse_code);

  // Pass through other fields as-is
  normalized.ip_name = row.ip_name;
  normalized.funding_source = row.funding_source;
  normalized.programme = row.programme;
  normalized.pcr_service = row.pcr_service;
  normalized.cd4_service = row.cd4_service;
  normalized.type_of_service = row.type_of_service;
  normalized.operatingHours = row.operatingHours;

  return {
    original: row,
    normalized,
    dbMatches: {
      lga: lgaMatch,
      zone: zoneMatch,
      facilityType: facilityTypeMatch,
      levelOfCare: levelOfCareMatch,
    },
  };
}

/**
 * Batch clean multiple facility rows
 */
export function cleanFacilityRows(
  rows: Record<string, any>[],
  dbTables: DBTables
): NormalizedRow[] {
  return rows.map((row) => cleanFacilityRow(row, dbTables));
}

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CSVFacilityData, csvFacilitySchema } from './facility-validation';

export type FileFormat = 'csv' | 'xlsx' | 'xls';

export interface ParsedFile {
  headers: string[];
  rows: any[];
  format: FileFormat;
}

export interface ValidationResult {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

/**
 * Column name mapping - maps common variations to expected field names
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  'name': ['name', 'facility name', 'facility_name', 'facilityname', 'health facility name', 'health facility'],
  'address': [
    'address', 'street address', 'address line 1', 'facility address', 'location', 'street',
    'full address', 'site address', 'facility location', 'physical address', 'geo address',
    'complete address', 'address_line_1'
  ],
  'latitude': [
    'latitude', 'lat', 'latitude coordinate', 'lat coordinate', 'latitude (decimal)',
    'gps lat', 'y coordinate', 'gps latitude', 'lat.', 'geo_lat', 'latitude_decimal',
    'decimal latitude', 'lat (decimal)'
  ],
  'longitude': [
    'longitude', 'lon', 'long', 'lng', 'longitude coordinate', 'lon coordinate', 'long coordinate',
    'longitude (decimal)', 'gps lon', 'x coordinate', 'gps longitude', 'lon.', 'lng.',
    'geo_lng', 'longitude_decimal', 'decimal longitude', 'lon (decimal)', 'long (decimal)'
  ],
  'geo_coordinates': [
    'geo-coordinates', 'geo coordinates', 'geocoordinates', 'coordinates', 'coordinate',
    'geo-coordinates (longitude/latitude)', 'geo coordinates (longitude/latitude)',
    'geo-coordinates (latitude/longitude)', 'geo coordinates (latitude/longitude)',
    'lat/long', 'lat/lon', 'latitude/longitude', 'long/lat', 'lon/lat', 'longitude/latitude',
    'gps coordinates', 'gps', 'location coordinates'
  ],
  'lga': ['lga', 'local government area', 'local govt area', 'lga name'],
  'ward': ['ward', 'ward name'],
  'service_zone': ['service_zone', 'service zone', 'zone', 'service area'],
  'level_of_care': ['level_of_care', 'level of care', 'care level', 'loc'],
  'warehouse_code': ['warehouse_code', 'warehouse code', 'code', 'facility code'],
  'state': ['state', 'state name'],
  'ip_name': ['ip_name', 'ip name', 'implementing partner', 'partner'],
  'funding_source': ['funding_source', 'funding source', 'funder', 'funding'],
  'programme': ['programme', 'program', 'programme name'],
  'pcr_service': ['pcr_service', 'pcr service', 'pcr'],
  'cd4_service': ['cd4_service', 'cd4 service', 'cd4'],
  'type_of_service': ['type_of_service', 'type of service', 'service type'],
  'contact_name_pharmacy': ['contact_name_pharmacy', 'contact name pharmacy', 'pharmacy contact', 'contact name'],
  'designation': ['designation', 'position', 'title'],
  'phone_pharmacy': ['phone_pharmacy', 'phone pharmacy', 'pharmacy phone', 'contact phone'],
  'email': ['email', 'email address', 'contact email'],
  'storage_capacity': ['storage_capacity', 'storage capacity', 'capacity'],
  'type': ['type', 'facility type'],
  'phone': ['phone', 'phone number', 'contact number'],
  'contactPerson': ['contactPerson', 'contact person', 'contact_person'],
  'capacity': ['capacity', 'bed capacity'],
  'operatingHours': ['operatingHours', 'operating hours', 'operating_hours', 'hours'],
};

/**
 * Parse combined geo-coordinates string into separate latitude and longitude
 * Handles various formats: "11.8007763 8.8487154", "11.8007763, 8.8487154", etc.
 *
 * @param value - The coordinate string to parse (e.g., "11.8007763 8.8487154")
 * @param columnName - Optional column header name to determine coordinate order
 */
function parseGeoCoordinates(value: string, columnName?: string): { latitude?: number; longitude?: number } {
  if (!value || typeof value !== 'string') {
    return {};
  }

  // Remove extra whitespace and normalize separators
  const cleaned = value.trim().replace(/\s+/g, ' ');

  // Try to extract numbers (supports space, comma, semicolon, pipe separators)
  const numbers = cleaned.split(/[\s,;|]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n));

  if (numbers.length < 2) {
    console.warn('[CSV Import] parseGeoCoordinates: Not enough numbers found in value:', value);
    return {};
  }

  // Get first two numbers
  const [first, second] = numbers;

  // Determine which is latitude and which is longitude
  // Latitude range: -90 to 90
  // Longitude range: -180 to 180

  // CRITICAL FIX: Check the COLUMN NAME (not the value) for order hints
  const lowerColumnName = columnName ? columnName.toLowerCase() : '';

  if (process.env.NODE_ENV === 'development') {
    console.log('[CSV Import] parseGeoCoordinates called:', {
      value,
      columnName,
      numbers: [first, second],
    });
  }

  // If column name explicitly indicates order as "longitude/latitude" or "lon/lat"
  if (lowerColumnName.includes('longitude/latitude') || lowerColumnName.includes('lon/lat') ||
      lowerColumnName.includes('long/lat') || lowerColumnName.includes('longitude latitude')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSV Import] Detected longitude/latitude order from column name');
    }
    return {
      longitude: first,
      latitude: second,
    };
  }

  // If column name explicitly indicates order as "latitude/longitude" or "lat/lon"
  if (lowerColumnName.includes('latitude/longitude') || lowerColumnName.includes('lat/lon') ||
      lowerColumnName.includes('lat/long') || lowerColumnName.includes('latitude longitude')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSV Import] Detected latitude/longitude order from column name');
    }
    return {
      latitude: first,
      longitude: second,
    };
  }

  // Auto-detect based on value ranges
  // If first value is > 90 or < -90, it must be longitude
  if (Math.abs(first) > 90) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSV Import] Auto-detected: first value >90, must be longitude');
    }
    return {
      longitude: first,
      latitude: second,
    };
  }

  // If second value is > 90 or < -90, it must be longitude
  if (Math.abs(second) > 90) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSV Import] Auto-detected: second value >90, must be longitude');
    }
    return {
      latitude: first,
      longitude: second,
    };
  }

  // Default assumption: first is longitude, second is latitude
  // (common in many systems like Google Maps)
  if (process.env.NODE_ENV === 'development') {
    console.log('[CSV Import] Using default order: longitude, latitude');
  }
  return {
    longitude: first,
    latitude: second,
  };
}

/**
 * Normalize column names to match expected field names
 */
function normalizeColumnNames(row: any): any {
  const normalized: any = {};
  const columnMappingMetadata: Record<string, string> = {}; // Track which original column mapped to each field

  // Log original columns for debugging (only log first row to avoid spam)
  if (process.env.NODE_ENV === 'development') {
    const originalColumns = Object.keys(row);
    if (originalColumns.length > 0) {
      console.log('[CSV Import] Original CSV columns:', originalColumns);
    }
  }

  // Create a lowercase version of all row keys for case-insensitive matching
  const rowKeysLowercase = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase().trim()] = key;
    return acc;
  }, {} as Record<string, string>);

  // Map each field using the column mappings
  for (const [targetField, variations] of Object.entries(COLUMN_MAPPINGS)) {
    // Find the first matching variation in the row
    for (const variation of variations) {
      const variationLower = variation.toLowerCase();
      if (rowKeysLowercase[variationLower]) {
        const originalKey = rowKeysLowercase[variationLower];
        normalized[targetField] = row[originalKey];
        // Track which original column name was used for this mapping
        columnMappingMetadata[targetField] = originalKey;
        break;
      }
    }
  }

  // Also copy any unmapped fields (preserve extra columns)
  // CRITICAL FIX: Only check if key exists, not if value exists elsewhere
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
    if (!normalized[normalizedKey]) {
      normalized[normalizedKey] = value;
    }
  }

  // INTELLIGENT FALLBACK: Parse combined geo-coordinates if lat/lng are missing
  const hasLatitude = normalized.latitude && String(normalized.latitude).trim() !== '';
  const hasLongitude = normalized.longitude && String(normalized.longitude).trim() !== '';

  if (process.env.NODE_ENV === 'development') {
    console.log('[CSV Import] Coordinate check:', {
      hasLatitude,
      hasLongitude,
      latitudeValue: normalized.latitude,
      longitudeValue: normalized.longitude,
      hasGeoCoordinates: !!normalized.geo_coordinates,
      geoCoordinatesValue: normalized.geo_coordinates,
      geoCoordinatesColumnName: columnMappingMetadata['geo_coordinates'],
    });
  }

  if ((!hasLatitude || !hasLongitude) && normalized.geo_coordinates) {
    const geoValue = String(normalized.geo_coordinates);
    const geoColumnName = columnMappingMetadata['geo_coordinates']; // Get original column header name

    if (geoValue.trim() !== '') {
      // Pass the original column name to help determine coordinate order
      const parsed = parseGeoCoordinates(geoValue, geoColumnName);

      if (process.env.NODE_ENV === 'development') {
        console.log('[CSV Import] Parsed geo-coordinates result:', parsed);
      }

      if (!hasLatitude && parsed.latitude !== undefined) {
        normalized.latitude = parsed.latitude;
        if (process.env.NODE_ENV === 'development') {
          console.log('[CSV Import] ✓ Extracted latitude from geo_coordinates:', parsed.latitude);
        }
      }

      if (!hasLongitude && parsed.longitude !== undefined) {
        normalized.longitude = parsed.longitude;
        if (process.env.NODE_ENV === 'development') {
          console.log('[CSV Import] ✓ Extracted longitude from geo_coordinates:', parsed.longitude);
        }
      }
    }
  }

  // Log normalized columns for debugging (only first row)
  if (process.env.NODE_ENV === 'development') {
    const normalizedColumns = Object.keys(normalized);
    if (normalizedColumns.length > 0) {
      console.log('[CSV Import] Normalized columns:', normalizedColumns);
      console.log('[CSV Import] Sample normalized data:', {
        name: normalized.name,
        address: normalized.address,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        geo_coordinates: normalized.geo_coordinates,
      });
    }
  }

  return normalized;
}

/**
 * Detect file format from file extension
 */
export function detectFileFormat(filename: string): FileFormat | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'csv':
      return 'csv';
    case 'xlsx':
      return 'xlsx';
    case 'xls':
      return 'xls';
    default:
      return null;
  }
}

/**
 * Parse CSV file using PapaParse
 */
function parseCSVFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        // Normalize column names in all rows
        const rows = (results.data as any[]).map(row => normalizeColumnNames(row));
        resolve({
          headers,
          rows,
          format: 'csv',
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file (.xlsx, .xls) using SheetJS
 */
function parseExcelFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Read workbook
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        // First row is headers
        const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());

        // Remaining rows are data
        const rows = jsonData.slice(1).map((row: any) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = row[index] !== undefined ? String(row[index]).trim() : '';
            }
          });
          // Normalize column names for consistent field access
          return normalizeColumnNames(obj);
        });

        resolve({
          headers: headers.filter(h => h), // Remove empty headers
          rows: rows.filter(row => Object.values(row).some(v => v)), // Remove empty rows
          format: file.name.endsWith('.xlsx') ? 'xlsx' : 'xls',
        });
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parse file based on detected format
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const format = detectFileFormat(file.name);

  if (!format) {
    throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
  }

  switch (format) {
    case 'csv':
      return parseCSVFile(file);
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    default:
      throw new Error('Unsupported file format');
  }
}

/**
 * Validate a single row of facility data
 */
export function validateFacilityRow(
  row: any,
  rowIndex: number,
  existingWarehouseCodes: Set<string> = new Set()
): ValidationResult[] {
  const issues: ValidationResult[] = [];

  // Check required fields
  if (!row.name || String(row.name).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'name',
      message: 'Name is required',
      severity: 'error',
      value: row.name,
    });
  }

  if (!row.address || String(row.address).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'address',
      message: 'Address is required',
      severity: 'error',
      value: row.address,
    });
  }

  // Validate coordinates
  if (row.latitude) {
    const lat = parseFloat(String(row.latitude));
    if (isNaN(lat) || lat < -90 || lat > 90) {
      issues.push({
        row: rowIndex + 1,
        field: 'latitude',
        message: 'Invalid latitude value (must be between -90 and 90)',
        severity: 'error',
        value: row.latitude,
      });
    }
  } else {
    issues.push({
      row: rowIndex + 1,
      field: 'latitude',
      message: 'Latitude is required',
      severity: 'error',
      value: row.latitude,
    });
  }

  if (row.longitude) {
    const lng = parseFloat(String(row.longitude));
    if (isNaN(lng) || lng < -180 || lng > 180) {
      issues.push({
        row: rowIndex + 1,
        field: 'longitude',
        message: 'Invalid longitude value (must be between -180 and 180)',
        severity: 'error',
        value: row.longitude,
      });
    }
  } else {
    issues.push({
      row: rowIndex + 1,
      field: 'longitude',
      message: 'Longitude is required',
      severity: 'error',
      value: row.longitude,
    });
  }

  // Validate email format
  if (row.email && String(row.email).trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(row.email))) {
      issues.push({
        row: rowIndex + 1,
        field: 'email',
        message: 'Invalid email format',
        severity: 'warning',
        value: row.email,
      });
    }
  }

  // Check for duplicate warehouse code
  if (row.warehouse_code && String(row.warehouse_code).trim() !== '') {
    const code = String(row.warehouse_code).trim();
    if (existingWarehouseCodes.has(code)) {
      issues.push({
        row: rowIndex + 1,
        field: 'warehouse_code',
        message: 'Duplicate warehouse code',
        severity: 'error',
        value: code,
      });
    }
  }

  // Warnings for missing recommended fields
  if (!row.lga || String(row.lga).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'lga',
      message: 'LGA is recommended',
      severity: 'warning',
      value: row.lga,
    });
  }

  if (!row.service_zone || String(row.service_zone).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'service_zone',
      message: 'Service Zone is recommended for route optimization',
      severity: 'warning',
      value: row.service_zone,
    });
  }

  if (!row.level_of_care || String(row.level_of_care).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'level_of_care',
      message: 'Level of Care is recommended',
      severity: 'warning',
      value: row.level_of_care,
    });
  }

  return issues;
}

/**
 * Validate all rows in parsed file
 */
export function validateParsedData(
  parsedData: ParsedFile,
  existingWarehouseCodes: Set<string> = new Set()
): ValidationResult[] {
  const allIssues: ValidationResult[] = [];
  const codesInFile = new Set<string>();

  parsedData.rows.forEach((row, index) => {
    // Check for duplicates within the file itself
    const combined = new Set([...existingWarehouseCodes, ...codesInFile]);
    const issues = validateFacilityRow(row, index, combined);

    // Track warehouse codes in this file
    if (row.warehouse_code && String(row.warehouse_code).trim() !== '') {
      codesInFile.add(String(row.warehouse_code).trim());
    }

    allIssues.push(...issues);
  });

  return allIssues;
}

/**
 * Get summary statistics from validation results
 */
export function getValidationSummary(issues: ValidationResult[]) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    totalIssues: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    hasBlockingErrors: errors.length > 0,
    affectedRows: new Set(issues.map(i => i.row)).size,
  };
}

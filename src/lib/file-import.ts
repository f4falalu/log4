import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CSVFacilityData, csvFacilitySchema } from './facility-validation';

export type FileFormat = 'csv' | 'xlsx' | 'xls';

export interface ColumnMappingDiagnostic {
  originalHeader: string;
  mappedTo: string | null;
  isRecognized: boolean;
}

export interface ParsedFile {
  headers: string[];
  rows: any[];
  format: FileFormat;
  columnMappings?: ColumnMappingDiagnostic[];
}

export interface ValidationResult {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
  confidence?: 'exact' | 'fuzzy' | 'none'; // For DB matching results
}

/**
 * Skip configuration for optional fields
 * If a field is marked as skipped, validation will not flag it as missing
 */
export interface SkipConfig {
  ward?: boolean;
  service_zone?: boolean;
  level_of_care?: boolean;
  facility_type?: boolean;
  warehouse_code?: boolean;
}

/**
 * Column name mapping - maps common variations to expected field names
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  'name': ['name', 'facility name', 'facility_name', 'facilityname', 'health facility name', 'health facility', 'facility', 'site name'],
  'address': [
    'address', 'street address', 'address line 1', 'facility address', 'location', 'street',
    'full address', 'site address', 'facility location', 'physical address', 'geo address',
    'complete address', 'address_line_1', 'addr', 'address1', 'street_address'
  ],
  'latitude': [
    'latitude', 'lat', 'latitude coordinate', 'lat coordinate', 'latitude (decimal)',
    'gps lat', 'y coordinate', 'gps latitude', 'lat.', 'geo_lat', 'latitude_decimal',
    'decimal latitude', 'lat (decimal)', 'latitud', 'y', 'y coord', 'y_coordinate',
    'gps_lat', 'gps_latitude', 'lat_decimal', 'decimal_latitude', 'latitude_dd', 'lat_dd'
  ],
  'longitude': [
    'longitude', 'lon', 'long', 'lng', 'longitude coordinate', 'lon coordinate', 'long coordinate',
    'longitude (decimal)', 'gps lon', 'x coordinate', 'gps longitude', 'lon.', 'lng.',
    'geo_lng', 'longitude_decimal', 'decimal longitude', 'lon (decimal)', 'long (decimal)',
    'longitud', 'x', 'x coord', 'x_coordinate', 'gps_lon', 'gps_lng', 'gps_longitude',
    'lon_decimal', 'lng_decimal', 'decimal_longitude', 'longitude_dd', 'lon_dd', 'lng_dd', 'long.'
  ],
  'geo_coordinates': [
    'geo-coordinates', 'geo coordinates', 'geocoordinates', 'coordinates', 'coordinate',
    'geo-coordinates (longitude/latitude)', 'geo coordinates (longitude/latitude)',
    'geo-coordinates (latitude/longitude)', 'geo coordinates (latitude/longitude)',
    'lat/long', 'lat/lon', 'latitude/longitude', 'long/lat', 'lon/lat', 'longitude/latitude',
    'gps coordinates', 'gps', 'location coordinates', 'coords', 'geo_coords', 'geo-coords',
    'latlong', 'latlng', 'longlat', 'lnglat', 'lat_long', 'lat_lng', 'long_lat', 'lng_lat'
  ],
  'lga': ['lga', 'local government area', 'local govt area', 'lga name', 'l.g.a', 'l g a', 'local govt', 'lg area', 'local_govt_area', 'local_government', 'local government area (lga)'],
  'ward': ['ward', 'ward name', 'ward_name', 'political ward', 'ward / locality', 'ward/locality', 'locality/ward', 'locality', 'ward locality', 'locality / ward'],
  'service_zone': ['service_zone', 'service zone', 'zone', 'service area', 'service_area', 'delivery zone', 'servicezone'],
  'level_of_care': ['level_of_care', 'level of care', 'care level', 'loc', 'levelofcare', 'level_care', 'facility level'],
  'warehouse_code': ['warehouse_code', 'warehouse code', 'code', 'facility code', 'warehouse_id', 'facility_code', 'site code', 'site_code', 'wh_code'],
  'state': ['state', 'state name', 'state_name', 'province'],
  'ip_name': ['ip_name', 'ip name', 'implementing partner', 'partner', 'ip', 'implementing_partner', 'partner_name'],
  'funding_source': ['funding_source', 'funding source', 'funder', 'funding', 'funding_agency', 'donor'],
  'programme': ['programme', 'program', 'programme name', 'program_name', 'programme_name'],
  'pcr_service': ['pcr_service', 'pcr service', 'pcr', 'pcr_test', 'pcr test'],
  'cd4_service': ['cd4_service', 'cd4 service', 'cd4', 'cd4_test', 'cd4 test'],
  'type_of_service': ['type_of_service', 'type of service', 'service type', 'service_type', 'typeofservice'],
  'contact_name_pharmacy': ['contact_name_pharmacy', 'contact name pharmacy', 'pharmacy contact', 'contact name', 'pharmacy_contact_name', 'pharm_contact'],
  'designation': ['designation', 'position', 'title', 'job title', 'job_title', 'role'],
  'phone_pharmacy': ['phone_pharmacy', 'phone pharmacy', 'pharmacy phone', 'contact phone', 'pharmacy_phone', 'pharm_phone', 'pharmacy_tel'],
  'email': ['email', 'email address', 'contact email', 'email_address', 'e-mail', 'mail'],
  'storage_capacity': ['storage_capacity', 'storage capacity', 'capacity', 'storage_cap', 'storage'],
  'type': ['type', 'facility type', 'facility_type', 'facilitytype', 'category'],
  'phone': ['phone', 'phone number', 'contact number', 'telephone', 'tel', 'phone_number', 'contact_number', 'mobile'],
  'contactPerson': ['contactPerson', 'contact person', 'contact_person', 'contact', 'focal person', 'focal_person'],
  'capacity': ['capacity', 'bed capacity', 'bed_capacity', 'total capacity', 'total_capacity'],
  'operatingHours': ['operatingHours', 'operating hours', 'operating_hours', 'hours', 'operation hours', 'working hours', 'working_hours'],
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

  // Remove enclosing brackets, parentheses, and extra whitespace
  const cleaned = value
    .trim()
    .replace(/^[\[\(]+/, '')  // Remove leading brackets/parens
    .replace(/[\]\)]+$/, '')  // Remove trailing brackets/parens
    .replace(/\s+/g, ' ');     // Normalize whitespace

  // Try to extract numbers (supports space, comma, semicolon, pipe separators)
  const numbers = cleaned.split(/[\s,;|]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n));

  if (numbers.length < 2) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CSV Import] parseGeoCoordinates: Not enough numbers found in value:', value);
    }
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
      value,
      columnName,
      numbers: [first, second],
    });
  }

  // If column name explicitly indicates order as "longitude/latitude" or "lon/lat"
  if (lowerColumnName.includes('longitude/latitude') || lowerColumnName.includes('lon/lat') ||
      lowerColumnName.includes('long/lat') || lowerColumnName.includes('longitude latitude')) {
    if (process.env.NODE_ENV === 'development') {
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
    }
    return {
      longitude: first,
      latitude: second,
    };
  }

  // If second value is > 90 or < -90, it must be longitude
  if (Math.abs(second) > 90) {
    if (process.env.NODE_ENV === 'development') {
    }
    return {
      latitude: first,
      longitude: second,
    };
  }

  // Default assumption: first is longitude, second is latitude
  // (common in many systems like Google Maps)
  if (process.env.NODE_ENV === 'development') {
  }
  return {
    longitude: first,
    latitude: second,
  };
}

/**
 * Normalize column names to match expected field names
 */
function normalizeColumnNames(row: any, generateDiagnostics: boolean = false): { normalized: any; diagnostics?: ColumnMappingDiagnostic[] } {
  const normalized: any = {};
  const columnMappingMetadata: Record<string, string> = {}; // Track which original column mapped to each field
  const diagnostics: ColumnMappingDiagnostic[] = [];

  // Log original columns for debugging (only log first row to avoid spam)
  if (process.env.NODE_ENV === 'development') {
    const originalColumns = Object.keys(row);
    if (originalColumns.length > 0) {
    }
  }

  // Create a lowercase version of all row keys for case-insensitive matching
  const rowKeysLowercase = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase().trim()] = key;
    return acc;
  }, {} as Record<string, string>);

  // Track which original columns were mapped
  const mappedOriginalColumns = new Set<string>();

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
        mappedOriginalColumns.add(originalKey);
        break;
      }
    }
  }

  // Generate diagnostics if requested
  if (generateDiagnostics) {
    const originalHeaders = Object.keys(row);
    for (const header of originalHeaders) {
      const isMapped = mappedOriginalColumns.has(header);
      const mappedTo = isMapped
        ? Object.entries(columnMappingMetadata).find(([_, orig]) => orig === header)?.[0] || null
        : null;

      diagnostics.push({
        originalHeader: header,
        mappedTo,
        isRecognized: isMapped,
      });
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
      }

      if (!hasLatitude && parsed.latitude !== undefined) {
        normalized.latitude = parsed.latitude;
        if (process.env.NODE_ENV === 'development') {
        }
      }

      if (!hasLongitude && parsed.longitude !== undefined) {
        normalized.longitude = parsed.longitude;
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }
  }

  // Log normalized columns for debugging (only first row)
  if (process.env.NODE_ENV === 'development') {
    const normalizedColumns = Object.keys(normalized);
    if (normalizedColumns.length > 0) {
        name: normalized.name,
        address: normalized.address,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        geo_coordinates: normalized.geo_coordinates,
      });
    }
  }

  return { normalized, diagnostics: generateDiagnostics ? diagnostics : undefined };
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
        // Normalize column names in all rows, generating diagnostics from first row only
        let columnMappings: ColumnMappingDiagnostic[] | undefined;
        const rows = (results.data as any[]).map((row, index) => {
          const { normalized, diagnostics } = normalizeColumnNames(row, index === 0);
          if (index === 0 && diagnostics) {
            columnMappings = diagnostics;
          }
          return normalized;
        });
        resolve({
          headers,
          rows,
          format: 'csv',
          columnMappings,
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

        // Remaining rows are data, generate diagnostics from first row only
        let columnMappings: ColumnMappingDiagnostic[] | undefined;
        const rows = jsonData.slice(1).map((row: any, index) => {
          const obj: any = {};
          headers.forEach((header, idx) => {
            if (header) {
              obj[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
            }
          });
          // Normalize column names for consistent field access
          const { normalized, diagnostics } = normalizeColumnNames(obj, index === 0);
          if (index === 0 && diagnostics) {
            columnMappings = diagnostics;
          }
          return normalized;
        });

        resolve({
          headers: headers.filter(h => h), // Remove empty headers
          rows: rows.filter(row => Object.values(row).some(v => v)), // Remove empty rows
          format: file.name.endsWith('.xlsx') ? 'xlsx' : 'xls',
          columnMappings,
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
 * @param row - The facility row data
 * @param rowIndex - Zero-based index of the row
 * @param existingWarehouseCodes - Set of existing warehouse codes to check for duplicates
 * @param skipConfig - Configuration for which optional fields to skip validation
 * @param dbMatchResults - Results from DB matching for validation
 */
export function validateFacilityRow(
  row: any,
  rowIndex: number,
  existingWarehouseCodes: Set<string> = new Set(),
  skipConfig: SkipConfig = {},
  dbMatchResults?: {
    lga?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    zone?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    facilityType?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    levelOfCare?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
  }
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

  // LGA is now REQUIRED (not just recommended)
  if (!row.lga || String(row.lga).trim() === '') {
    issues.push({
      row: rowIndex + 1,
      field: 'lga',
      message: 'LGA is required',
      severity: 'error',
      value: row.lga,
    });
  } else if (dbMatchResults?.lga) {
    // Validate LGA against database
    if (dbMatchResults.lga.confidence === 'none') {
      issues.push({
        row: rowIndex + 1,
        field: 'lga',
        message: `LGA "${row.lga}" not found in database. Contact admin to add this LGA.`,
        severity: 'error',
        value: row.lga,
        confidence: 'none',
      });
    } else if (dbMatchResults.lga.confidence === 'fuzzy') {
      issues.push({
        row: rowIndex + 1,
        field: 'lga',
        message: `LGA "${row.lga}" fuzzy-matched in database. Please verify it's correct.`,
        severity: 'warning',
        value: row.lga,
        confidence: 'fuzzy',
      });
    }
  }

  // Service Zone validation (optional, respects skip config)
  if (!skipConfig.service_zone) {
    if (!row.service_zone || String(row.service_zone).trim() === '') {
      issues.push({
        row: rowIndex + 1,
        field: 'service_zone',
        message: 'Service Zone is recommended for route optimization',
        severity: 'warning',
        value: row.service_zone,
      });
    } else if (dbMatchResults?.zone) {
      // Validate zone against database
      if (dbMatchResults.zone.confidence === 'none') {
        issues.push({
          row: rowIndex + 1,
          field: 'service_zone',
          message: `Service Zone "${row.service_zone}" not found in database. Please correct or select from available zones.`,
          severity: 'warning',
          value: row.service_zone,
          confidence: 'none',
        });
      } else if (dbMatchResults.zone.confidence === 'fuzzy') {
        issues.push({
          row: rowIndex + 1,
          field: 'service_zone',
          message: `Service Zone "${row.service_zone}" fuzzy-matched in database. Please verify it's correct.`,
          severity: 'warning',
          value: row.service_zone,
          confidence: 'fuzzy',
        });
      }
    }
  }

  // Level of Care validation (optional, respects skip config)
  if (!skipConfig.level_of_care) {
    if (!row.level_of_care || String(row.level_of_care).trim() === '') {
      issues.push({
        row: rowIndex + 1,
        field: 'level_of_care',
        message: 'Level of Care is recommended',
        severity: 'warning',
        value: row.level_of_care,
      });
    } else if (dbMatchResults?.levelOfCare) {
      // Validate level of care against database
      if (dbMatchResults.levelOfCare.confidence === 'none') {
        issues.push({
          row: rowIndex + 1,
          field: 'level_of_care',
          message: `Level of Care "${row.level_of_care}" not found in database. Please select: Primary, Secondary, or Tertiary.`,
          severity: 'warning',
          value: row.level_of_care,
          confidence: 'none',
        });
      } else if (dbMatchResults.levelOfCare.confidence === 'fuzzy') {
        issues.push({
          row: rowIndex + 1,
          field: 'level_of_care',
          message: `Level of Care "${row.level_of_care}" fuzzy-matched in database. Please verify it's correct.`,
          severity: 'warning',
          value: row.level_of_care,
          confidence: 'fuzzy',
        });
      }
    }
  }

  // Facility Type validation (optional, respects skip config)
  if (!skipConfig.facility_type) {
    if (row.type && String(row.type).trim() !== '' && dbMatchResults?.facilityType) {
      // Validate facility type against database
      if (dbMatchResults.facilityType.confidence === 'none') {
        issues.push({
          row: rowIndex + 1,
          field: 'type',
          message: `Facility Type "${row.type}" not found in database. Please select from available types.`,
          severity: 'warning',
          value: row.type,
          confidence: 'none',
        });
      } else if (dbMatchResults.facilityType.confidence === 'fuzzy') {
        issues.push({
          row: rowIndex + 1,
          field: 'type',
          message: `Facility Type "${row.type}" fuzzy-matched in database. Please verify it's correct.`,
          severity: 'warning',
          value: row.type,
          confidence: 'fuzzy',
        });
      }
    }
  }

  // Ward validation (optional, respects skip config)
  if (!skipConfig.ward) {
    if (!row.ward || String(row.ward).trim() === '') {
      issues.push({
        row: rowIndex + 1,
        field: 'ward',
        message: 'Ward is recommended',
        severity: 'warning',
        value: row.ward,
      });
    }
  }

  return issues;
}

/**
 * Validate all rows in parsed file
 * @param parsedData - The parsed file data
 * @param existingWarehouseCodes - Set of existing warehouse codes from database
 * @param skipConfig - Skip configuration for optional fields
 * @param normalizedRows - Optional normalized row data with DB match results
 */
export function validateParsedData(
  parsedData: ParsedFile,
  existingWarehouseCodes: Set<string> = new Set(),
  skipConfig: SkipConfig = {},
  normalizedRows?: Array<{
    normalized: Record<string, any>;
    dbMatches: {
      lga?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
      zone?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
      facilityType?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
      levelOfCare?: { id: string | null; confidence: 'exact' | 'fuzzy' | 'none' };
    };
  }>
): ValidationResult[] {
  const allIssues: ValidationResult[] = [];
  const codesInFile = new Set<string>();

  parsedData.rows.forEach((row, index) => {
    // Check for duplicates within the file itself
    const combined = new Set([...existingWarehouseCodes, ...codesInFile]);

    // Get DB match results for this row if available
    const dbMatchResults = normalizedRows?.[index]?.dbMatches;

    // Validate row
    const issues = validateFacilityRow(row, index, combined, skipConfig, dbMatchResults);

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

/**
 * Apply manual column mappings to parsed data
 * @param parsedData - The parsed file data
 * @param manualMappings - Map of expected field names to CSV column headers
 * @returns Updated parsed data with columns renamed according to manual mappings
 */
export function applyManualMappings(
  parsedData: ParsedFile,
  manualMappings: Record<string, string>
): ParsedFile {
  // Create reverse mapping: CSV header -> expected field name
  const reverseMapping: Record<string, string> = {};
  for (const [expectedField, csvHeader] of Object.entries(manualMappings)) {
    if (csvHeader) {
      reverseMapping[csvHeader] = expectedField;
    }
  }

  if (process.env.NODE_ENV === 'development') {
  }

  // Apply mappings to all rows
  const mappedRows = parsedData.rows.map((row) => {
    const mappedRow: any = {};

    // For each field in the original row
    for (const [originalKey, value] of Object.entries(row)) {
      // If this field has a manual mapping, use the expected field name
      if (reverseMapping[originalKey]) {
        const expectedField = reverseMapping[originalKey];
        mappedRow[expectedField] = value;

        if (process.env.NODE_ENV === 'development') {
        }
      } else {
        // Otherwise, keep the original key (lowercase normalized)
        const normalizedKey = originalKey.toLowerCase().trim().replace(/\s+/g, '_');
        mappedRow[normalizedKey] = value;
      }
    }

    return mappedRow;
  });

  // Update column mappings diagnostics to reflect manual mappings
  const updatedDiagnostics: ColumnMappingDiagnostic[] = parsedData.headers.map((header) => ({
    originalHeader: header,
    mappedTo: reverseMapping[header] || null,
    isRecognized: !!reverseMapping[header],
  }));

  return {
    ...parsedData,
    rows: mappedRows,
    columnMappings: updatedDiagnostics,
  };
}

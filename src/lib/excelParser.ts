import * as XLSX from 'xlsx';

export interface ParsedRow {
  facilityId?: string;
  facilityName?: string;
  address: string;
  orderVolume?: number;
  timeWindow?: string;
  rowIndex: number;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParsedData {
  rows: ParsedRow[];
  errors: ValidationError[];
  isValid: boolean;
}

export async function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Skip header row
        const rows: ParsedRow[] = jsonData.slice(1).map((row, index) => ({
          facilityId: row[0]?.toString(),
          facilityName: row[1]?.toString(),
          address: row[2]?.toString() || '',
          orderVolume: row[3] ? Number(row[3]) : undefined,
          timeWindow: row[4]?.toString(),
          rowIndex: index + 2, // +2 because we skipped header and arrays are 0-indexed
        }));

        const errors = validateFacilityData(rows);

        resolve({
          rows,
          errors,
          isValid: errors.filter(e => e.severity === 'error').length === 0,
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

export function validateFacilityData(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];

  rows.forEach((row) => {
    // Validate facility ID
    if (!row.facilityId || row.facilityId.trim() === '') {
      errors.push({
        rowIndex: row.rowIndex,
        field: 'facilityId',
        message: 'Facility ID is required',
        severity: 'error',
      });
    }

    // Validate address
    if (!row.address || row.address.trim() === '') {
      errors.push({
        rowIndex: row.rowIndex,
        field: 'address',
        message: 'Address is required',
        severity: 'error',
      });
    } else if (row.address.length < 10) {
      errors.push({
        rowIndex: row.rowIndex,
        field: 'address',
        message: 'Address seems too short',
        severity: 'warning',
      });
    }

    // Validate order volume
    if (row.orderVolume !== undefined && (isNaN(row.orderVolume) || row.orderVolume <= 0)) {
      errors.push({
        rowIndex: row.rowIndex,
        field: 'orderVolume',
        message: 'Order volume must be a positive number',
        severity: 'error',
      });
    }

    // Validate time window format
    if (row.timeWindow && !isValidTimeWindow(row.timeWindow)) {
      errors.push({
        rowIndex: row.rowIndex,
        field: 'timeWindow',
        message: 'Invalid time window format (expected: HH:MM-HH:MM)',
        severity: 'warning',
      });
    }
  });

  return errors;
}

function isValidTimeWindow(timeWindow: string): boolean {
  const timeWindowRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeWindowRegex.test(timeWindow);
}

export function generateTemplate(): void {
  const template = [
    ['Facility ID', 'Facility Name', 'Address', 'Order Volume', 'Time Window'],
    ['FAC-001', 'Example Clinic', '123 Main St, City, State', '50', '09:00-12:00'],
    ['FAC-002', 'Sample Hospital', '456 Oak Ave, City, State', '100', '13:00-17:00'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule Template');

  XLSX.writeFile(workbook, 'schedule_template.xlsx');
}

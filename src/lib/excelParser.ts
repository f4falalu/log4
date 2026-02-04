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
  // Lazy load ExcelJS library only when parsing files
  const ExcelJS = await import('exceljs');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        const jsonData: any[][] = [];

        worksheet.eachRow((row) => {
          jsonData.push(row.values as any[]);
        });

        // Skip header row and adjust for ExcelJS 1-based indexing
        const rows: ParsedRow[] = jsonData.slice(2).map((row, index) => ({
          facilityId: row[1]?.toString(),
          facilityName: row[2]?.toString(),
          address: row[3]?.toString() || '',
          orderVolume: row[4] ? Number(row[4]) : undefined,
          timeWindow: row[5]?.toString(),
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

    reader.readAsArrayBuffer(file);
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

export async function generateTemplate(): Promise<void> {
  const ExcelJS = await import('exceljs');

  const template = [
    ['Facility ID', 'Facility Name', 'Address', 'Order Volume', 'Time Window'],
    ['FAC-001', 'Example Clinic', '123 Main St, City, State', '50', '09:00-12:00'],
    ['FAC-002', 'Sample Hospital', '456 Oak Ave, City, State', '100', '13:00-17:00'],
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Schedule Template');

  template.forEach(row => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'schedule_template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

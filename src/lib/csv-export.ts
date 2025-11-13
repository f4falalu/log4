import { Facility } from '@/types';
import Papa from 'papaparse';

/**
 * Exports facilities to CSV format
 * @param facilities - Array of facilities to export
 * @param visibleColumns - Map of column names to visibility
 * @param filename - Optional custom filename (defaults to 'facilities-export.csv')
 */
export function exportFacilitiesToCSV(
  facilities: Facility[],
  visibleColumns?: Record<string, boolean>,
  filename: string = 'facilities-export.csv'
): void {
  if (!facilities || facilities.length === 0) {
    throw new Error('No facilities to export');
  }

  // Define all possible columns with their headers
  const allColumns = {
    warehouse_code: 'Warehouse Code',
    name: 'Facility Name',
    state: 'State',
    lga: 'LGA',
    ward: 'Ward',
    address: 'Physical Address',
    lat: 'Latitude',
    lng: 'Longitude',
    level_of_care: 'Level of Care',
    programme: 'Programme',
    funding_source: 'Funding Source',
    service_zone: 'Service Zone',
    ip_name: 'IP Name',
    type_of_service: 'Type of Service',
    pcr_service: 'PCR Service',
    cd4_service: 'CD4 Service',
    contact_name_pharmacy: 'Contact Name (Pharmacy)',
    designation: 'Designation',
    phone_pharmacy: 'Phone (Pharmacy)',
    email: 'Email',
    storage_capacity: 'Storage Capacity',
    capacity: 'General Capacity',
    type: 'Facility Type',
    phone: 'Phone',
    contactPerson: 'Contact Person',
    operatingHours: 'Operating Hours',
    created_at: 'Created At',
    updated_at: 'Updated At',
  };

  // Filter columns based on visibility if provided
  const columnsToExport = visibleColumns
    ? Object.keys(allColumns).filter(
        (key) => visibleColumns[key] !== false
      )
    : Object.keys(allColumns);

  // Transform facilities data to CSV format
  const csvData = facilities.map((facility) => {
    const row: Record<string, any> = {};

    columnsToExport.forEach((key) => {
      const value = facility[key as keyof Facility];

      // Format values for CSV
      if (key === 'pcr_service' || key === 'cd4_service') {
        row[allColumns[key as keyof typeof allColumns]] = value ? 'Yes' : 'No';
      } else if (key === 'lat' || key === 'lng') {
        row[allColumns[key as keyof typeof allColumns]] = typeof value === 'number' ? value.toFixed(6) : '';
      } else if (value === null || value === undefined) {
        row[allColumns[key as keyof typeof allColumns]] = '';
      } else {
        row[allColumns[key as keyof typeof allColumns]] = value;
      }
    });

    return row;
  });

  // Generate CSV using Papa Parse
  const csv = Papa.unparse(csvData, {
    quotes: true,
    header: true,
  });

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generates a filename with current timestamp
 */
export function generateExportFilename(prefix: string = 'facilities'): string {
  const date = new Date();
  const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `${prefix}-export-${timestamp}-${time}.csv`;
}

/**
 * Downloads a CSV template for importing facilities
 */
export function downloadCSVTemplate(): void {
  const headers = [
    'name',
    'address',
    'latitude',
    'longitude',
    'warehouse_code',
    'state',
    'ip_name',
    'funding_source',
    'programme',
    'pcr_service',
    'cd4_service',
    'type_of_service',
    'service_zone',
    'level_of_care',
    'lga',
    'ward',
    'contact_name_pharmacy',
    'designation',
    'phone_pharmacy',
    'email',
    'storage_capacity',
  ];

  const exampleRow = {
    name: 'Example Health Center',
    address: '123 Main Street, Kano',
    latitude: '12.000000',
    longitude: '8.500000',
    warehouse_code: 'PSM/KAN/01/001',
    state: 'kano',
    ip_name: 'smoh',
    funding_source: 'pepfar--usaid',
    programme: 'HIV/AIDS',
    pcr_service: 'Yes',
    cd4_service: 'No',
    type_of_service: 'ART',
    service_zone: 'Central',
    level_of_care: 'Primary',
    lga: 'Kano Municipal',
    ward: 'Central Ward',
    contact_name_pharmacy: 'John Doe',
    designation: 'Pharmacist',
    phone_pharmacy: '+234-123-456-7890',
    email: 'pharmacy@example.com',
    storage_capacity: '1000',
  };

  const csv = Papa.unparse([exampleRow], {
    quotes: true,
    header: true,
    columns: headers,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'facilities-import-template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

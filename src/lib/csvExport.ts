/**
 * Simple CSV export utility
 */

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains quotes, commas, or newlines, wrap in quotes and escape existing quotes
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function toCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create header row
  const headerRow = headers.map(escapeCSV).join(',');

  // Create data rows
  const dataRows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadJSON(content: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

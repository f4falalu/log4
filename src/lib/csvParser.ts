import Papa from 'papaparse';

export interface ParsedRequisitionItem {
  item_name: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  volume_m3?: number;
  temperature_required: boolean;
  handling_instructions?: string;
}

export interface CSVParseResult {
  items: ParsedRequisitionItem[];
  errors: string[];
  warnings: string[];
}

// Normalize column names to handle variations
const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s-]/g, '_')
    .replace(/[()]/g, '');
};

// Column name mappings to handle variations
const columnMappings: Record<string, string> = {
  'item_name': 'item_name',
  'item': 'item_name',
  'name': 'item_name',
  'product_name': 'item_name',
  'product': 'item_name',
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
  'unit': 'unit',
  'units': 'unit',
  'uom': 'unit',
  'weight_kg': 'weight_kg',
  'weight': 'weight_kg',
  'weight_in_kg': 'weight_kg',
  'volume_m3': 'volume_m3',
  'volume': 'volume_m3',
  'volume_in_m3': 'volume_m3',
  'temperature_required': 'temperature_required',
  'temp_required': 'temperature_required',
  'temperature': 'temperature_required',
  'cold_chain': 'temperature_required',
  'handling_instructions': 'handling_instructions',
  'instructions': 'handling_instructions',
  'notes': 'handling_instructions',
  'special_instructions': 'handling_instructions',
};

// Convert various boolean representations to boolean
const parseBoolean = (value: string | boolean | number): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  
  const normalized = String(value).toLowerCase().trim();
  return ['yes', 'true', '1', 'y'].includes(normalized);
};

export const parseCSV = (file: File): Promise<CSVParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings initially for better control
      complete: (results) => {
        const items: ParsedRequisitionItem[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];

        // Normalize headers
        const normalizedHeaders: Record<string, string> = {};
        if (results.meta.fields) {
          results.meta.fields.forEach((field) => {
            const normalized = normalizeColumnName(field);
            const mapped = columnMappings[normalized] || normalized;
            normalizedHeaders[field] = mapped;
          });
        }

        // Check for required columns
        const hasItemName = Object.values(normalizedHeaders).includes('item_name');
        const hasQuantity = Object.values(normalizedHeaders).includes('quantity');

        if (!hasItemName) {
          errors.push('Missing required column: item_name (or item, name, product)');
        }
        if (!hasQuantity) {
          errors.push('Missing required column: quantity (or qty, amount)');
        }

        if (errors.length > 0) {
          resolve({ items, errors, warnings });
          return;
        }

        // Parse each row
        results.data.forEach((row: any, index: number) => {
          const rowNum = index + 2; // +2 because index is 0-based and header is row 1

          // Normalize row data
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            const mappedKey = normalizedHeaders[key];
            if (mappedKey) {
              normalizedRow[mappedKey] = row[key];
            }
          });

          // Extract required fields
          const itemName = String(normalizedRow.item_name || '').trim();
          const quantityStr = String(normalizedRow.quantity || '').trim();

          // Skip empty rows
          if (!itemName && !quantityStr) {
            return;
          }

          // Validate required fields
          if (!itemName) {
            errors.push(`Row ${rowNum}: Missing item name`);
            return;
          }

          const quantity = parseFloat(quantityStr);
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Row ${rowNum}: Invalid quantity "${quantityStr}"`);
            return;
          }

          // Parse optional fields
          const unit = String(normalizedRow.unit || 'units').trim();
          
          let weight_kg: number | undefined;
          if (normalizedRow.weight_kg) {
            const parsed = parseFloat(String(normalizedRow.weight_kg));
            if (!isNaN(parsed) && parsed >= 0) {
              weight_kg = parsed;
            } else {
              warnings.push(`Row ${rowNum}: Invalid weight value, skipping`);
            }
          }

          let volume_m3: number | undefined;
          if (normalizedRow.volume_m3) {
            const parsed = parseFloat(String(normalizedRow.volume_m3));
            if (!isNaN(parsed) && parsed >= 0) {
              volume_m3 = parsed;
            } else {
              warnings.push(`Row ${rowNum}: Invalid volume value, skipping`);
            }
          }

          const temperature_required = normalizedRow.temperature_required
            ? parseBoolean(normalizedRow.temperature_required)
            : false;

          const handling_instructions = normalizedRow.handling_instructions
            ? String(normalizedRow.handling_instructions).trim()
            : undefined;

          // Add warning for rows without weight/volume
          if (!weight_kg && !volume_m3) {
            warnings.push(`Row ${rowNum}: No weight or volume specified`);
          }

          // Add warning for high quantities
          if (quantity > 1000) {
            warnings.push(`Row ${rowNum}: Unusually high quantity (${quantity})`);
          }

          items.push({
            item_name: itemName,
            quantity,
            unit,
            weight_kg,
            volume_m3,
            temperature_required,
            handling_instructions,
          });
        });

        resolve({ items, errors, warnings });
      },
      error: (error) => {
        resolve({
          items: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          warnings: [],
        });
      },
    });
  });
};

// Generate a CSV template for download
export const generateCSVTemplate = (): string => {
  const headers = [
    'item_name',
    'quantity',
    'unit',
    'weight_kg',
    'volume_m3',
    'temperature_required',
    'handling_instructions',
  ];

  const examples = [
    ['Medical Supplies A', '100', 'boxes', '50.5', '2.3', 'Yes', 'Keep upright'],
    ['Vaccines', '50', 'units', '10.2', '0.5', 'Yes', 'Maintain cold chain at 2-8°C'],
    ['Surgical Equipment', '25', 'sets', '75.0', '3.5', 'No', 'Handle with care, fragile items'],
  ];

  const rows = [headers, ...examples];
  return rows.map(row => row.join(',')).join('\n');
};

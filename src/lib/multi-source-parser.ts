import Papa from 'papaparse';
import type { FileFormat, ParsedFile, ColumnMappingDiagnostic } from './file-import';
import { detectFileFormat, normalizeColumnNames } from './file-import';
import { similarityScore, normalizeName } from './fuzzy-match';

// --- Memory safety constants ---
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ROWS_PER_SHEET = 10_000;

// --- Workbook cache to avoid double-loading same file ---
// inspectFile() loads the workbook to enumerate sheets,
// then parseExcelSheet() would load it again. Cache it in between.
const workbookCache = new WeakMap<File, import('exceljs').Workbook>();

function validateFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File "${file.name}" is ${sizeMB} MB — maximum is ${MAX_FILE_SIZE_MB} MB. ` +
      `Try splitting the file or removing unnecessary sheets/data.`
    );
  }
}

export interface SheetInfo {
  index: number;
  name: string;
  rowCount: number;
  headers: string[];
  sampleValues: string[];
}

export interface FileInfo {
  file: File;
  format: FileFormat;
  sheets: SheetInfo[];
}

export interface SourceSelection {
  file: File;
  sheetIndex?: number;
  sheetName?: string;
}

export interface ValueConflict {
  type: 'value_conflict';
  facilityName: string;
  field: string;
  values: string[];
}

export interface FuzzyNameConflict {
  type: 'fuzzy_name';
  facilityName: string;
  similarName: string;
  similarity: number;
  rowIndexA: number;
  rowIndexB: number;
}

export type MergeConflict = ValueConflict | FuzzyNameConflict;

export interface MergeResult {
  merged: any[];
  autoMergedCount: number;
  conflicts: MergeConflict[];
}

export interface MultiSourceResult extends ParsedFile {
  sources: { name: string; rowCount: number }[];
  mergeResult?: MergeResult;
}

/**
 * Inspect a file to discover its sheets/structure without fully parsing all data.
 * For CSV files, returns a single "sheet" with the file name.
 * For Excel files, enumerates all sheets with names, row counts, and header previews.
 */
export async function inspectFile(file: File): Promise<FileInfo> {
  validateFileSize(file);

  const format = detectFileFormat(file.name);
  if (!format) {
    throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
  }

  if (format === 'csv') {
    const preview = await previewCSV(file);
    return {
      file,
      format,
      sheets: [{
        index: 0,
        name: file.name,
        rowCount: preview.rowCount,
        headers: preview.headers,
        sampleValues: preview.sampleValues,
      }],
    };
  }

  // Excel: enumerate all sheets
  const workbook = await loadWorkbook(file);

  const sheets: SheetInfo[] = workbook.worksheets.map((ws, idx) => {
    let rowCount = 0;
    const headers: string[] = [];
    const sampleValues: string[] = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        const vals = row.values as any[];
        for (let i = 1; i < vals.length; i++) {
          headers.push(String(vals[i] || '').trim());
        }
      } else if (rowNumber === 2) {
        const vals = row.values as any[];
        for (let i = 1; i < vals.length; i++) {
          sampleValues.push(String(vals[i] || '').trim());
        }
      }
      rowCount++;
    });

    return {
      index: idx,
      name: ws.name,
      rowCount: Math.max(0, rowCount - 1),
      headers,
      sampleValues,
    };
  });

  return { file, format, sheets };
}

/**
 * Parse selected sources into a unified ParsedFile-compatible result.
 * Merges headers (union) and concatenates rows from all sources.
 */
export async function parseSelectedSources(
  selections: SourceSelection[]
): Promise<MultiSourceResult> {
  if (selections.length === 0) {
    throw new Error('No sources selected');
  }

  const allRows: any[] = [];
  const sources: { name: string; rowCount: number }[] = [];
  // Merge diagnostics across all sources (keyed by mappedTo to deduplicate)
  const diagnosticMap = new Map<string, ColumnMappingDiagnostic>();

  for (const selection of selections) {
    const format = detectFileFormat(selection.file.name);
    if (!format) continue;

    let parsed: { headers: string[]; rows: any[]; columnMappings?: ColumnMappingDiagnostic[] };

    if (format === 'csv') {
      parsed = await parseCSVSource(selection.file);
    } else {
      parsed = await parseExcelSheet(selection.file, selection.sheetIndex ?? 0);
    }

    // Collect rows
    allRows.push(...parsed.rows);

    // Merge column diagnostics from all sources
    if (parsed.columnMappings) {
      for (const diag of parsed.columnMappings) {
        // For recognized mappings, keep the first one found (keyed by normalized field)
        if (diag.isRecognized && diag.mappedTo) {
          if (!diagnosticMap.has(diag.mappedTo)) {
            diagnosticMap.set(diag.mappedTo, diag);
          }
        } else {
          // Unrecognized headers: key by original name, don't overwrite recognized ones
          const key = `__unmapped__${diag.originalHeader}`;
          if (!diagnosticMap.has(key)) {
            diagnosticMap.set(key, diag);
          }
        }
      }
    }

    sources.push({
      name: selection.sheetName || selection.file.name,
      rowCount: parsed.rows.length,
    });
  }

  // Cross-sheet merge: deduplicate rows by primary key (name) when multiple sources
  let finalRows = allRows;
  let mergeResult: MergeResult | undefined;

  if (selections.length > 1) {
    mergeResult = mergeRowsByPrimaryKey(allRows);
    finalRows = mergeResult.merged;
  }

  // Build unified headers from the actual normalized keys across all rows
  const normalizedHeaders = new Set<string>();
  for (const row of finalRows) {
    for (const key of Object.keys(row)) {
      normalizedHeaders.add(key);
    }
  }

  return {
    headers: Array.from(normalizedHeaders),
    rows: finalRows,
    format: selections.length === 1 && detectFileFormat(selections[0].file.name) === 'csv'
      ? 'csv'
      : 'xlsx',
    columnMappings: Array.from(diagnosticMap.values()),
    sources,
    mergeResult,
  };
}

// --- Cross-sheet merge logic ---

const FUZZY_NAME_THRESHOLD = 0.75;

/**
 * Merge rows from multiple sheets by primary key (facility name).
 * - Exact name matches (case-insensitive): auto-merge columns, flag value conflicts
 * - Fuzzy name matches: flag for user review
 * - Nameless rows: kept as-is (will fail validation later)
 */
export function mergeRowsByPrimaryKey(rows: any[]): MergeResult {
  const map = new Map<string, { row: any; sources: any[] }>();
  const order: string[] = [];
  const conflicts: MergeConflict[] = [];
  let autoMergedCount = 0;

  for (const row of rows) {
    const rawName = (row.name || '').toString().trim();
    const key = normalizeName(rawName);

    if (!key) {
      // Rows without a name can't be merged — keep as-is
      const uniqueKey = `__unnamed_${order.length}`;
      map.set(uniqueKey, { row: { ...row }, sources: [row] });
      order.push(uniqueKey);
      continue;
    }

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.sources.push(row);

      // Merge columns: fill empty fields, detect value conflicts
      for (const [field, value] of Object.entries(row)) {
        const newVal = String(value || '').trim();
        const oldVal = String(existing.row[field] || '').trim();

        if (newVal && !oldVal) {
          // Fill empty field from this sheet
          existing.row[field] = value;
        } else if (
          newVal && oldVal &&
          newVal.toLowerCase() !== oldVal.toLowerCase() &&
          field !== 'name' // don't flag the key field itself
        ) {
          // Value conflict: same facility, different values for same field
          // Check if this exact conflict is already recorded
          const alreadyRecorded = conflicts.some(
            c => c.type === 'value_conflict' &&
              c.facilityName === existing.row.name &&
              c.field === field
          );
          if (!alreadyRecorded) {
            conflicts.push({
              type: 'value_conflict',
              facilityName: existing.row.name,
              field,
              values: [oldVal, newVal],
            });
          } else {
            // Append additional value if not already present
            const existing_conflict = conflicts.find(
              c => c.type === 'value_conflict' &&
                c.facilityName === existing.row.name &&
                c.field === field
            ) as ValueConflict | undefined;
            if (existing_conflict && !existing_conflict.values.includes(newVal)) {
              existing_conflict.values.push(newVal);
            }
          }
        }
      }
      autoMergedCount++;
    } else {
      map.set(key, { row: { ...row }, sources: [row] });
      order.push(key);
    }
  }

  // Build merged rows in insertion order
  const mergedRows = order.map(k => map.get(k)!.row);

  // Second pass: detect fuzzy name duplicates among distinct merged entries
  const namedEntries: { name: string; index: number }[] = [];
  for (let i = 0; i < mergedRows.length; i++) {
    const name = (mergedRows[i].name || '').toString().trim();
    if (name) {
      namedEntries.push({ name, index: i });
    }
  }

  // O(n²) on unique names — acceptable for typical facility lists (<1000)
  for (let i = 0; i < namedEntries.length; i++) {
    for (let j = i + 1; j < namedEntries.length; j++) {
      const score = similarityScore(
        namedEntries[i].name,
        namedEntries[j].name,
        FUZZY_NAME_THRESHOLD
      );
      if (score >= FUZZY_NAME_THRESHOLD) {
        conflicts.push({
          type: 'fuzzy_name',
          facilityName: namedEntries[i].name,
          similarName: namedEntries[j].name,
          similarity: Math.round(score * 100) / 100,
          rowIndexA: namedEntries[i].index,
          rowIndexB: namedEntries[j].index,
        });
      }
    }
  }

  return { merged: mergedRows, autoMergedCount, conflicts };
}

// --- Internal helpers ---

function previewCSV(file: File): Promise<{ headers: string[]; sampleValues: string[]; rowCount: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const firstRow = results.data[0] as Record<string, any> | undefined;
        const sampleValues = headers.map(h => String(firstRow?.[h] || '').trim());
        resolve({
          headers,
          sampleValues,
          rowCount: results.data.length,
        });
      },
      error: (error) => reject(new Error(`Failed to preview CSV: ${error.message}`)),
    });
  });
}

function parseCSVSource(file: File): Promise<{ headers: string[]; rows: any[]; columnMappings?: ColumnMappingDiagnostic[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        let columnMappings: ColumnMappingDiagnostic[] | undefined;
        const rows = (results.data as any[]).map((row, index) => {
          const { normalized, diagnostics } = normalizeColumnNames(row, index === 0);
          if (index === 0 && diagnostics) {
            columnMappings = diagnostics;
          }
          return normalized;
        });
        resolve({ headers, rows, columnMappings });
      },
      error: (error) => reject(new Error(`Failed to parse CSV: ${error.message}`)),
    });
  });
}

async function loadWorkbook(file: File): Promise<import('exceljs').Workbook> {
  const cached = workbookCache.get(file);
  if (cached) return cached;

  const ExcelJS = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  workbookCache.set(file, workbook);
  return workbook;
}

/** Release cached workbook for a file to free memory. */
export function releaseWorkbookCache(file: File) {
  workbookCache.delete(file);
}

async function parseExcelSheet(
  file: File,
  sheetIndex: number
): Promise<{ headers: string[]; rows: any[]; columnMappings?: ColumnMappingDiagnostic[] }> {
  const workbook = await loadWorkbook(file);

  const worksheet = workbook.worksheets[sheetIndex];
  if (!worksheet) {
    throw new Error(`Sheet at index ${sheetIndex} not found`);
  }

  let headers: string[] = [];
  const rows: any[] = [];
  let columnMappings: ColumnMappingDiagnostic[] | undefined;
  let dataRowIndex = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Header row
      const vals = row.values as any[];
      headers = vals.slice(1).map(h => String(h || '').trim());
      return;
    }

    // Enforce row limit to prevent OOM
    if (dataRowIndex >= MAX_ROWS_PER_SHEET) return;

    const vals = row.values as any[];
    const rowData = vals.slice(1);
    const obj: any = {};
    headers.forEach((header, idx) => {
      if (header) {
        obj[header] = rowData[idx] !== undefined ? String(rowData[idx]).trim() : '';
      }
    });

    // Skip entirely empty rows
    if (!Object.values(obj).some(v => v)) return;

    const { normalized, diagnostics } = normalizeColumnNames(obj, dataRowIndex === 0);
    if (dataRowIndex === 0 && diagnostics) {
      columnMappings = diagnostics;
    }
    rows.push(normalized);
    dataRowIndex++;
  });

  // Release cache after parsing to free memory
  releaseWorkbookCache(file);

  return {
    headers: headers.filter(h => h),
    rows,
    columnMappings,
  };
}

/**
 * =====================================================
 * File Upload Column (Left Column — Upload source)
 * =====================================================
 * Replaces SourceOfTruthColumn when the user picks
 * "Upload File" in Step 1.  Accepts PDF, CSV, XLSX, DOCX,
 * parses facility names, and fuzzy-matches them against the
 * facilities database so the user can review/correct before
 * adding to the working set.
 */

import * as React from 'react';
import {
  FileUp,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ParsedFacility } from '@/types/unified-workflow';
import type { WorkingSetItem } from '@/types/unified-workflow';

// =====================================================
// File-type icons
// =====================================================

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'xlsx') return <FileSpreadsheet className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

// =====================================================
// Types
// =====================================================

interface Facility {
  id: string;
  name: string;
}

interface FileUploadColumnProps {
  /** All facilities from the database (for matching) */
  allFacilities: Facility[];
  /** Currently parsed rows */
  parsedFacilities: ParsedFacility[] | null;
  /** Callbacks */
  onFileParsed: (facilities: ParsedFacility[]) => void;
  onUpdateRow: (rowIndex: number, updates: Partial<ParsedFacility>) => void;
  onAddValidToWorkingSet: () => void;
  className?: string;
}

// =====================================================
// Parsing helpers
// =====================================================

const ACCEPTED_TYPES = '.csv,.xlsx,.pdf,.docx';

/** Normalise a string for comparison */
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple fuzzy match — returns a score from 0-1 */
function fuzzyScore(input: string, candidate: string): number {
  const a = norm(input);
  const b = norm(candidate);
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.9;

  // Token overlap
  const tokA = a.split(' ');
  const tokB = new Set(b.split(' '));
  const matched = tokA.filter((t) => tokB.has(t)).length;
  if (tokA.length === 0) return 0;
  return matched / Math.max(tokA.length, tokB.size);
}

/** Match a raw name against all facilities and return the best match */
function matchFacility(
  rawName: string,
  facilities: Facility[],
): { id: string | null; name: string | null; score: number } {
  let best = { id: null as string | null, name: null as string | null, score: 0 };
  for (const f of facilities) {
    const score = fuzzyScore(rawName, f.name);
    if (score > best.score) {
      best = { id: f.id, name: f.name, score };
    }
  }
  return best;
}

// =====================================================
// File Parsers
// =====================================================

async function parseCSV(file: File): Promise<string[]> {
  const Papa = await import('papaparse');
  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Try common column names for facility
        const rows = results.data as Record<string, string>[];
        const colNames = Object.keys(rows[0] || {});
        const facilityCol = colNames.find((c) =>
          /facility|name|site|health.?facility|location|destination/i.test(c),
        );
        if (facilityCol) {
          resolve(rows.map((r) => r[facilityCol]).filter(Boolean));
        } else {
          // Fallback: first column
          const firstCol = colNames[0];
          resolve(rows.map((r) => r[firstCol]).filter(Boolean));
        }
      },
      error: (err: any) => reject(err),
    });
  });
}

async function parseXLSX(file: File): Promise<string[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  // Find the header row (first row) and look for a facility column
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value || '');
  });

  let facilityColIdx = headers.findIndex((h) =>
    /facility|name|site|health.?facility|location|destination/i.test(h),
  );
  if (facilityColIdx === -1) facilityColIdx = 1; // fallback to first col (1-indexed in exceljs)

  const names: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const val = row.getCell(facilityColIdx === 0 ? 1 : facilityColIdx).value;
    if (val) names.push(String(val).trim());
  });
  return names;
}

async function parsePDF(file: File): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    // Split by common delimiters and newlines
    pageText.split(/[\n\r]+/).forEach((l: string) => {
      const trimmed = l.trim();
      if (trimmed.length > 2) lines.push(trimmed);
    });
  }
  return lines;
}

async function parseDOCX(file: File): Promise<string[]> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  // Extract text from HTML by stripping tags
  const div = document.createElement('div');
  div.innerHTML = result.value;
  const text = div.textContent || '';
  return text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);
}

async function extractFacilityNames(file: File): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv':
      return parseCSV(file);
    case 'xlsx':
      return parseXLSX(file);
    case 'pdf':
      return parsePDF(file);
    case 'docx':
      return parseDOCX(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

// =====================================================
// Component
// =====================================================

export function FileUploadColumn({
  allFacilities,
  parsedFacilities,
  onFileParsed,
  onUpdateRow,
  onAddValidToWorkingSet,
  className,
}: FileUploadColumnProps) {
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File) => {
      setIsParsing(true);
      setError(null);
      setFileName(file.name);

      try {
        const names = await extractFacilityNames(file);
        if (names.length === 0) {
          setError('No facility names found in the file. Please check the format.');
          setIsParsing(false);
          return;
        }

        // Deduplicate
        const unique = [...new Set(names)];

        // Match against DB facilities
        const parsed: ParsedFacility[] = unique.map((rawName, idx) => {
          const match = matchFacility(rawName, allFacilities);
          return {
            row_index: idx,
            raw_name: rawName,
            matched_facility_id: match.score >= 0.5 ? match.id : null,
            matched_facility_name: match.score >= 0.5 ? match.name : null,
            confidence_score: match.score,
            is_valid: match.score >= 0.5,
          };
        });

        onFileParsed(parsed);
      } catch (err: any) {
        setError(err.message || 'Failed to parse file');
      } finally {
        setIsParsing(false);
      }
    },
    [allFacilities, onFileParsed],
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const validCount = parsedFacilities?.filter((f) => f.is_valid).length ?? 0;
  const invalidCount = (parsedFacilities?.length ?? 0) - validCount;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Upload Zone */}
      {!parsedFacilities && !isParsing && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            'hover:border-primary/50 hover:bg-accent/30',
            'text-muted-foreground',
          )}
        >
          <Upload className="h-10 w-10" />
          <div className="text-center">
            <p className="font-medium text-foreground">Drop file here or click to browse</p>
            <p className="text-xs mt-1">Supports PDF, CSV, XLSX, DOCX</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Parsing spinner */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center gap-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Parsing {fileName}…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Parsed results */}
      {parsedFacilities && !isParsing && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-2 text-sm">
              {fileIcon(fileName || '')}
              <span className="font-medium truncate max-w-[140px]">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {validCount} matched
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {invalidCount} unmatched
                </Badge>
              )}
            </div>
          </div>

          {/* Row list */}
          <ScrollArea className="flex-1 -mx-1">
            <div className="space-y-2 px-1">
              {parsedFacilities.map((row) => (
                <ParsedRow
                  key={row.row_index}
                  row={row}
                  allFacilities={allFacilities}
                  onUpdate={(updates) => onUpdateRow(row.row_index, updates)}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onFileParsed(null as any);
                setFileName(null);
                setError(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              disabled={validCount === 0}
              onClick={onAddValidToWorkingSet}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add {validCount} to Schedule
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// Parsed Row Sub-component
// =====================================================

interface ParsedRowProps {
  row: ParsedFacility;
  allFacilities: Facility[];
  onUpdate: (updates: Partial<ParsedFacility>) => void;
}

function ParsedRow({ row, allFacilities, onUpdate }: ParsedRowProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border text-sm',
        row.is_valid ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
      )}
    >
      {/* Status icon */}
      <div className="pt-0.5">
        {row.is_valid ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground truncate">
          From file: <span className="font-medium text-foreground">{row.raw_name}</span>
        </p>

        {row.is_valid && row.matched_facility_name ? (
          <p className="text-xs">
            Matched: <span className="font-medium">{row.matched_facility_name}</span>
            <span className="ml-1 text-muted-foreground">
              ({Math.round(row.confidence_score * 100)}%)
            </span>
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={row.matched_facility_id || ''}
              onValueChange={(value) => {
                const fac = allFacilities.find((f) => f.id === value);
                if (fac) {
                  onUpdate({
                    matched_facility_id: fac.id,
                    matched_facility_name: fac.name,
                    confidence_score: 1,
                    is_valid: true,
                    user_corrected: true,
                  });
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select facility…" />
              </SelectTrigger>
              <SelectContent>
                {allFacilities.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUploadColumn;

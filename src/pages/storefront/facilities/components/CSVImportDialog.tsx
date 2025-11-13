import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileUp, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useCreateFacility } from '@/hooks/useFacilities';
import { transformCsvToFacility } from '@/lib/facility-validation';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedCSV {
  headers: string[];
  rows: any[];
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const createFacility = useCreateFacility();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    // Parse CSV file
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setParsedData({
          headers,
          rows: results.data,
        });
        // Auto-select all columns by default
        setSelectedColumns(new Set(headers));
        toast.success(`CSV parsed: ${results.data.length} rows found`);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
        setFile(null);
      },
    });
  };

  const toggleColumn = (column: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(column)) {
      newSet.delete(column);
    } else {
      newSet.add(column);
    }
    setSelectedColumns(newSet);
  };

  const validateData = () => {
    if (!parsedData) return;

    const issues: ValidationIssue[] = [];

    parsedData.rows.forEach((row, index) => {
      // Check required fields
      if (!row.name || row.name.trim() === '') {
        issues.push({
          row: index + 1,
          field: 'name',
          message: 'Name is required',
          severity: 'error',
        });
      }

      // Validate coordinates
      if (row.latitude) {
        const lat = parseFloat(row.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          issues.push({
            row: index + 1,
            field: 'latitude',
            message: 'Invalid latitude value',
            severity: 'error',
          });
        }
      }

      if (row.longitude) {
        const lng = parseFloat(row.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          issues.push({
            row: index + 1,
            field: 'longitude',
            message: 'Invalid longitude value',
            severity: 'error',
          });
        }
      }

      // Validate email format
      if (row.email && row.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          issues.push({
            row: index + 1,
            field: 'email',
            message: 'Invalid email format',
            severity: 'warning',
          });
        }
      }

      // Check for missing address
      if (!row.address || row.address.trim() === '') {
        issues.push({
          row: index + 1,
          field: 'address',
          message: 'Address is recommended',
          severity: 'warning',
        });
      }
    });

    setValidationIssues(issues);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.rows.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsImporting(true);
    const result: ImportResult = {
      total: parsedData.rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < parsedData.rows.length; i++) {
      const row = parsedData.rows[i];

      try {
        // Filter row to only include selected columns
        const filteredRow: any = {};
        selectedColumns.forEach((col) => {
          if (row[col] !== undefined) {
            filteredRow[col] = row[col];
          }
        });

        // Transform CSV row to facility format
        const facilityData = transformCsvToFacility(filteredRow);

        // Create facility
        await createFacility.mutateAsync(facilityData);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }

    setIsImporting(false);
    setImportResult(result);

    if (result.success > 0) {
      toast.success(`Successfully imported ${result.success} facilities`);
    }
    if (result.failed > 0) {
      toast.error(`Failed to import ${result.failed} facilities`);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setSelectedColumns(new Set());
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Facilities from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import facilities. Column headers will be auto-detected.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* File Upload Section */}
          {!parsedData && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <div className="mt-2">
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isImporting}
                  />
                </div>
              </div>

              {/* CSV Format Guide */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">CSV Format Guidelines:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>First row should contain column headers</li>
                      <li>Headers can be in any order and will be auto-detected</li>
                      <li>Recommended columns: name, address, lat, lng, lga, ward, service_zone, level_of_care, programme</li>
                      <li>Missing optional fields will be left blank</li>
                      <li>Warehouse codes will be auto-generated if not provided</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Column Selection Section */}
          {parsedData && !importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Detected Columns ({parsedData.headers.length})</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.rows.length} rows ready to import
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedColumns(new Set(parsedData.headers))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedColumns(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg max-h-[300px] overflow-y-auto">
                {parsedData.headers.map((header) => (
                  <div key={header} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${header}`}
                      checked={selectedColumns.has(header)}
                      onCheckedChange={() => toggleColumn(header)}
                    />
                    <label
                      htmlFor={`col-${header}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {header}
                    </label>
                  </div>
                ))}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedColumns.size}</strong> columns selected for import
                </AlertDescription>
              </Alert>

              {/* Sample Data Preview */}
              <div>
                <h4 className="font-medium mb-2">Preview (First Row)</h4>
                <div className="border rounded-lg p-3 bg-muted/50 max-h-[150px] overflow-auto">
                  {parsedData.rows.length > 0 && (
                    <div className="space-y-1 text-sm font-mono">
                      {Array.from(selectedColumns).map((col) => (
                        <div key={col}>
                          <span className="text-muted-foreground">{col}:</span>{' '}
                          <span>{parsedData.rows[0][col] || '(empty)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Results Section */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-6 border rounded-lg bg-muted/50">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="bg-green-600">
                      {importResult.success} succeeded
                    </Badge>
                    {importResult.failed > 0 && (
                      <Badge variant="destructive">
                        {importResult.failed} failed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Import Errors</h4>
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {importResult.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-3 border-b last:border-b-0 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div>
                            <span className="font-medium">Row {err.row}:</span>{' '}
                            <span className="text-muted-foreground">{err.error}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              {parsedData && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedColumns.size === 0}
                >
                  {isImporting ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Import {parsedData.rows.length} Facilities
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

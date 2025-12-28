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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileUp,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useCreateFacility } from '@/hooks/useFacilities';
import { transformCsvToFacility } from '@/lib/facility-validation';
import { toast } from 'sonner';
import {
  parseFile,
  validateParsedData,
  getValidationSummary,
  applyManualMappings,
  type ParsedFile,
  type ValidationResult,
  type SkipConfig,
} from '@/lib/file-import';
import { ColumnMapper, type ColumnMapping, type ColumnMapperResult } from './ColumnMapper';
import { cleanFacilityRows, type DBTables, type NormalizedRow } from '@/lib/data-cleaners';
import { useFacilityTypes } from '@/hooks/useFacilityTypes';
import { useLevelsOfCare } from '@/hooks/useLevelsOfCare';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useLGAs } from '@/hooks/useLGAs';
import { generateWarehouseCode } from '@/lib/warehouse-code-generator';

interface EnhancedCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export function EnhancedCSVImportDialog({ open, onOpenChange }: EnhancedCSVImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFile | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [skipConfig, setSkipConfig] = useState<SkipConfig>({});
  const [autoGenerateWarehouseCode, setAutoGenerateWarehouseCode] = useState(false);
  const [normalizedRows, setNormalizedRows] = useState<NormalizedRow[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationResult[]>([]);
  const [editedRows, setEditedRows] = useState<Record<number, any>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const createFacility = useCreateFacility();

  // Fetch DB reference data for normalization and validation
  const { data: facilityTypes = [] } = useFacilityTypes();
  const { data: levelsOfCare = [] } = useLevelsOfCare();
  const { data: zones = [] } = useOperationalZones();
  const { data: lgas = [] } = useLGAs();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target?.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    toast.loading('Parsing file...');

    try {
      const parsed = await parseFile(selectedFile);
      setParsedData(parsed);

      // Extract auto-detected mappings from column diagnostics
      const autoMappings: ColumnMapping = {};
      if (parsed.columnMappings) {
        parsed.columnMappings.forEach((diag) => {
          if (diag.isRecognized && diag.mappedTo) {
            autoMappings[diag.mappedTo] = diag.originalHeader;
          }
        });
      }
      setColumnMappings(autoMappings);

      toast.dismiss();
      toast.success(`File parsed: ${parsed.rows.length} rows found`);

      // ALWAYS show mapping step (per requirement)
      // This allows users to review and confirm auto-detected mappings
      const requiredFields = ['name', 'address', 'latitude', 'longitude', 'lga'];
      const missingRequired = requiredFields.filter(field => !autoMappings[field]);

      if (missingRequired.length > 0) {
        toast.info(`Please map ${missingRequired.length} required fields`);
      } else {
        toast.success('All required fields auto-detected. Please review mappings.');
      }

      // Always go to mapping step
      setStep('mapping');
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to parse file: ${error.message}`);
      setFile(null);
    }
  };

  const handleMappingsConfirmed = (result: ColumnMapperResult) => {
    if (!parsedData) return;

    const { mappings, skipConfig: newSkipConfig, autoGenerateWarehouseCode: autoGenerate } = result;

    setColumnMappings(mappings);
    setSkipConfig(newSkipConfig);
    setAutoGenerateWarehouseCode(autoGenerate);

    // Apply manual mappings to the data
    const mappedData = applyManualMappings(parsedData, mappings);
    setParsedData(mappedData);

    toast.loading('Cleaning and validating data...');

    // Build DB tables for normalization
    const dbTables: DBTables = {
      zones,
      lgas,
      facilityTypes,
      levelsOfCare,
    };

    // Clean and normalize all rows with DB matching
    const cleaned = cleanFacilityRows(mappedData.rows, dbTables);
    setNormalizedRows(cleaned);

    // Apply normalized values back to parsed data for preview
    const normalizedParsedData = {
      ...mappedData,
      rows: cleaned.map((nr) => nr.normalized),
    };
    setParsedData(normalizedParsedData);

    // Validate with skip config and DB match results
    const issues = validateParsedData(
      normalizedParsedData,
      new Set(), // Will fetch existing warehouse codes later
      newSkipConfig,
      cleaned
    );
    setValidationIssues(issues);

    toast.dismiss();
    toast.success('Data cleaned and validated');
    setStep('preview');
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    setEditedRows(prev => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || parsedData?.rows[rowIndex] || {}),
        [field]: value,
      },
    }));

    // Re-validate after edit
    if (parsedData) {
      const updatedRows = parsedData.rows.map((row, idx) =>
        editedRows[idx] || row
      );
      const newParsed = { ...parsedData, rows: updatedRows };
      const newIssues = validateParsedData(newParsed);
      setValidationIssues(newIssues);
    }
  };

  const getMergedRow = (rowIndex: number) => {
    if (editedRows[rowIndex]) {
      return editedRows[rowIndex];
    }
    return parsedData?.rows[rowIndex] || {};
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');
    setImportProgress(0);

    const result: ImportResult = {
      total: parsedData.rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < parsedData.rows.length; i++) {
      try {
        const row = getMergedRow(i);

        // Handle warehouse code auto-generation
        if (autoGenerateWarehouseCode || !row.warehouse_code) {
          row.warehouse_code = await generateWarehouseCode(row.service_zone);
        }

        // Get normalized DB IDs from cleaned data
        const normalizedRow = normalizedRows[i];
        if (normalizedRow?.dbMatches) {
          // Use DB IDs for foreign key relationships
          if (normalizedRow.dbMatches.zone?.id) {
            row.zone_id = normalizedRow.dbMatches.zone.id;
          }
          if (normalizedRow.dbMatches.facilityType?.id) {
            row.facility_type_id = normalizedRow.dbMatches.facilityType.id;
          }
          if (normalizedRow.dbMatches.levelOfCare?.id) {
            row.level_of_care_id = normalizedRow.dbMatches.levelOfCare.id;
          }
        }

        const facilityData = transformCsvToFacility(row);
        await createFacility.mutateAsync(facilityData);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }

      setImportProgress(Math.round(((i + 1) / parsedData.rows.length) * 100));
    }

    setImportResult(result);
    setStep('complete');

    if (result.success > 0) {
      toast.success(`Successfully imported ${result.success} facilities`);
    }
    if (result.failed > 0) {
      toast.error(`Failed to import ${result.failed} facilities`);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setColumnMappings({});
    setSkipConfig({});
    setAutoGenerateWarehouseCode(false);
    setNormalizedRows([]);
    setValidationIssues([]);
    setEditedRows({});
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  const validationSummary = validationIssues.length > 0
    ? getValidationSummary(validationIssues)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Facilities
          </DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files (.csv, .xlsx, .xls) to bulk import facilities
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <StepIndicator active={step === 'upload'} completed={['mapping', 'preview', 'importing', 'complete'].includes(step)}>
            1. Upload
          </StepIndicator>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator active={step === 'mapping'} completed={['preview', 'importing', 'complete'].includes(step)}>
            2. Map Columns
          </StepIndicator>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator active={step === 'preview'} completed={['importing', 'complete'].includes(step)}>
            3. Preview
          </StepIndicator>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator active={step === 'importing'} completed={step === 'complete'}>
            4. Import
          </StepIndicator>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls)
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Guidelines</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>Required fields: name, address, latitude, longitude</li>
                    <li>Recommended: LGA, service_zone, level_of_care</li>
                    <li>Warehouse codes will be auto-generated if not provided</li>
                    <li>You'll be able to review and edit data before importing</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 'mapping' && parsedData && (
            <ColumnMapper
              csvHeaders={parsedData.headers}
              autoDetectedMappings={columnMappings}
              sampleRow={parsedData.rows[0]}
              onMappingsConfirmed={handleMappingsConfirmed}
              onBack={() => setStep('upload')}
            />
          )}

          {/* Step 3: Preview & Validate */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              {/* Column Mapping Diagnostics */}
              {parsedData.columnMappings && parsedData.columnMappings.length > 0 && (
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertTitle>Column Mapping Results</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {parsedData.columnMappings
                          .filter(m => m.isRecognized)
                          .map((mapping, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-success/10 border-success/20 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {mapping.originalHeader} → {mapping.mappedTo}
                            </Badge>
                          ))}
                      </div>
                      {parsedData.columnMappings.some(m => !m.isRecognized) && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-warning">Unrecognized columns:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {parsedData.columnMappings
                              .filter(m => !m.isRecognized)
                              .map((mapping, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-warning/10 border-warning/20 text-warning">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {mapping.originalHeader}
                                </Badge>
                              ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            These columns will be ignored during import.
                          </p>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Summary */}
              {validationSummary && (() => {
                const errorRate = parsedData && parsedData.rows.length > 0
                  ? (validationSummary.errors / parsedData.rows.length) * 100
                  : 0;
                const highErrorRate = errorRate > 20;

                return (
                  <Alert variant={validationSummary.hasBlockingErrors || highErrorRate ? 'destructive' : 'default'}>
                    {validationSummary.hasBlockingErrors || highErrorRate ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {validationSummary.hasBlockingErrors || highErrorRate ? 'Validation Issues Detected' : 'Validation Complete'}
                    </AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="font-medium">
                          {parsedData.rows.length} rows
                        </Badge>
                        {validationSummary.errors > 0 && (
                          <Badge variant="destructive" className="font-medium">
                            {validationSummary.errors} errors (block import)
                          </Badge>
                        )}
                        {validationSummary.warnings > 0 && (
                          <Badge variant="secondary" className="bg-warning/10 text-warning font-medium border-warning/20">
                            {validationSummary.warnings} warnings (allowed)
                          </Badge>
                        )}
                        {errorRate > 0 && (
                          <Badge variant={highErrorRate ? 'destructive' : 'outline'} className="font-medium">
                            {errorRate.toFixed(1)}% error rate
                          </Badge>
                        )}
                      </div>
                      {highErrorRate && (
                        <p className="text-sm mt-2 font-medium">
                          ⚠️ High error rate detected ({errorRate.toFixed(1)}%). Please review and fix critical issues before importing.
                          Import is disabled when error rate exceeds 20%.
                        </p>
                      )}
                      {validationSummary.hasBlockingErrors && !highErrorRate && (
                        <p className="text-sm mt-2">
                          Please fix all errors before importing. You can edit values in the table below or go back to adjust column mappings.
                        </p>
                      )}
                      {!validationSummary.hasBlockingErrors && validationSummary.warnings > 0 && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          Warnings won't block import, but it's recommended to review them for data quality.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {/* Data Preview Table */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Address</th>
                      <th className="p-2 text-left font-medium">Latitude</th>
                      <th className="p-2 text-left font-medium">Longitude</th>
                      <th className="p-2 text-left font-medium">LGA</th>
                      <th className="p-2 text-left font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.map((row, idx) => {
                      const mergedRow = getMergedRow(idx);
                      const rowIssues = validationIssues.filter(i => i.row === idx + 1);
                      const hasErrors = rowIssues.some(i => i.severity === 'error');

                      return (
                        <tr key={idx} className={hasErrors ? 'bg-destructive/10' : ''}>
                          <td className="p-2 border-t">{idx + 1}</td>
                          <td className="p-2 border-t">
                            <Input
                              value={mergedRow.name || ''}
                              onChange={(e) => handleCellEdit(idx, 'name', e.target.value)}
                              className="h-8"
                            />
                          </td>
                          <td className="p-2 border-t">
                            <Input
                              value={mergedRow.address || ''}
                              onChange={(e) => handleCellEdit(idx, 'address', e.target.value)}
                              className="h-8"
                            />
                          </td>
                          <td className="p-2 border-t">
                            <Input
                              value={mergedRow.latitude || ''}
                              onChange={(e) => handleCellEdit(idx, 'latitude', e.target.value)}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="p-2 border-t">
                            <Input
                              value={mergedRow.longitude || ''}
                              onChange={(e) => handleCellEdit(idx, 'longitude', e.target.value)}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="p-2 border-t">{mergedRow.lga || '-'}</td>
                          <td className="p-2 border-t">
                            {rowIssues.length > 0 && (
                              <div className="flex gap-1">
                                {rowIssues.filter(i => i.severity === 'error').length > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {rowIssues.filter(i => i.severity === 'error').length} errors
                                  </Badge>
                                )}
                                {rowIssues.filter(i => i.severity === 'warning').length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {rowIssues.filter(i => i.severity === 'warning').length} warnings
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>

              {/* Validation Issues List */}
              {validationIssues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Validation Issues</h4>
                  <ScrollArea className="h-[150px] border rounded-lg p-2">
                    <div className="space-y-1">
                      {validationIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50">
                          {issue.severity === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-medium">Row {issue.row}</span>
                            <span className="text-muted-foreground"> ({issue.field}): </span>
                            <span>{issue.message}</span>
                            {issue.value !== undefined && issue.value !== null && issue.value !== '' && (
                              <span className="block text-xs text-muted-foreground mt-0.5 font-mono bg-muted px-1.5 py-0.5 rounded">
                                Value: "{String(issue.value)}"
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto text-primary animate-pulse" />
                <h3 className="text-lg font-semibold mt-4">Importing Facilities...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we import your data</p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={importProgress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-6 border rounded-lg bg-muted/50">
                <CheckCircle className="h-12 w-12 text-success" />
                <div>
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="bg-success text-success-foreground">
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
                  <ScrollArea className="h-[200px] border rounded-lg">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="p-3 border-b last:border-b-0 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div>
                            <span className="font-medium">Row {err.row}:</span>{' '}
                            <span className="text-muted-foreground">{err.error}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (() => {
            const errorRate = parsedData && parsedData.rows.length > 0 && validationSummary
              ? (validationSummary.errors / parsedData.rows.length) * 100
              : 0;
            const highErrorRate = errorRate > 20;
            const importDisabled = validationSummary?.hasBlockingErrors || highErrorRate;

            return (
              <>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Mapping
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importDisabled}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Import {parsedData?.rows.length} Facilities
                </Button>
              </>
            );
          })()}

          {step === 'complete' && (
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

function StepIndicator({ active, completed, children }: { active: boolean; completed: boolean; children: React.ReactNode }) {
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
      ${active ? 'bg-primary text-primary-foreground' : ''}
      ${completed ? 'bg-success text-success-foreground' : ''}
      ${!active && !completed ? 'bg-muted text-muted-foreground' : ''}
    `}>
      {completed && <CheckCircle className="h-4 w-4" />}
      {children}
    </div>
  );
}

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
  type ParsedFile,
  type ValidationResult
} from '@/lib/file-import';

interface EnhancedCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

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
  const [validationIssues, setValidationIssues] = useState<ValidationResult[]>([]);
  const [editedRows, setEditedRows] = useState<Record<number, any>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const createFacility = useCreateFacility();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target?.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    toast.loading('Parsing file...');

    try {
      const parsed = await parseFile(selectedFile);
      setParsedData(parsed);

      // Validate data
      const issues = validateParsedData(parsed);
      setValidationIssues(issues);

      toast.dismiss();
      toast.success(`File parsed: ${parsed.rows.length} rows found`);
      setStep('preview');
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to parse file: ${error.message}`);
      setFile(null);
    }
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
          <StepIndicator active={step === 'upload'} completed={['preview', 'importing', 'complete'].includes(step)}>
            1. Upload
          </StepIndicator>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator active={step === 'preview'} completed={['importing', 'complete'].includes(step)}>
            2. Preview & Validate
          </StepIndicator>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <StepIndicator active={step === 'importing'} completed={step === 'complete'}>
            3. Import
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

          {/* Step 2: Preview & Validate */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              {/* Validation Summary */}
              {validationSummary && (
                <Alert variant={validationSummary.hasBlockingErrors ? 'destructive' : 'default'}>
                  {validationSummary.hasBlockingErrors ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {validationSummary.hasBlockingErrors ? 'Validation Errors Found' : 'Validation Complete'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="outline">{parsedData.rows.length} rows</Badge>
                      {validationSummary.errors > 0 && (
                        <Badge variant="destructive">{validationSummary.errors} errors</Badge>
                      )}
                      {validationSummary.warnings > 0 && (
                        <Badge variant="secondary">{validationSummary.warnings} warnings</Badge>
                      )}
                    </div>
                    {validationSummary.hasBlockingErrors && (
                      <p className="text-sm mt-2">
                        Please fix errors before importing. You can edit values in the table below.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

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
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-medium">Row {issue.row}</span>
                            <span className="text-muted-foreground"> ({issue.field}): </span>
                            <span>{issue.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
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

          {/* Step 4: Complete */}
          {step === 'complete' && importResult && (
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

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationSummary?.hasBlockingErrors}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Import {parsedData?.rows.length} Facilities
              </Button>
            </>
          )}

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
      ${completed ? 'bg-green-600 text-white' : ''}
      ${!active && !completed ? 'bg-muted text-muted-foreground' : ''}
    `}>
      {completed && <CheckCircle className="h-4 w-4" />}
      {children}
    </div>
  );
}

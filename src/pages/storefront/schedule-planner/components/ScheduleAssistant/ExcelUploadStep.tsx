import { useState, useCallback } from 'react';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseExcelFile, generateTemplate, ParsedData } from '@/lib/excelParser';
import { FacilityMapPreview } from './FacilityMapPreview';
import { Facility } from '@/types';

interface ExcelUploadStepProps {
  onDataParsed: (data: ParsedData) => void;
}

export function ExcelUploadStep({ onDataParsed }: ExcelUploadStepProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      onDataParsed(data);
    } catch (error) {
      console.error('File parsing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const errorCount = parsedData?.errors.filter(e => e.severity === 'error').length || 0;
  const warningCount = parsedData?.errors.filter(e => e.severity === 'warning').length || 0;

  // Mock facility data for map preview
  const mockFacilities: Facility[] = parsedData?.rows.slice(0, 5).map((row, i) => ({
    id: row.facilityId || `fac-${i}`,
    name: row.facilityName || `Facility ${i + 1}`,
    address: row.address,
    lat: 6.5244 + (Math.random() - 0.5) * 0.1,
    lng: 3.3792 + (Math.random() - 0.5) * 0.1,
    type: 'clinic',
  })) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Upload Excel File</h2>
          <p className="text-muted-foreground mt-1">
            Import your dispatch list from CSV or Excel
          </p>
        </div>
        <Button variant="outline" onClick={generateTemplate} className="gap-2">
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      {!parsedData && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isLoading ? 'Processing file...' : 'Drop your file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .xlsx, .xls, .csv files
            </p>
            <Button variant="outline" disabled={isLoading}>
              <label className="cursor-pointer">
                Browse File
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  disabled={isLoading}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
      )}

      {parsedData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            {(errorCount > 0 || warningCount > 0) && (
              <Alert variant={errorCount > 0 ? 'destructive' : 'default'}>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  {errorCount > 0 && `${errorCount} errors found. `}
                  {warningCount > 0 && `${warningCount} warnings. `}
                  {errorCount > 0 && 'Fix errors before proceeding.'}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.map((row) => {
                        const rowErrors = parsedData.errors.filter(
                          e => e.rowIndex === row.rowIndex
                        );
                        const hasError = rowErrors.some(e => e.severity === 'error');

                        return (
                          <TableRow
                            key={row.rowIndex}
                            className={hasError ? 'bg-destructive/10' : ''}
                          >
                            <TableCell className="font-mono text-sm">
                              {row.facilityId || '-'}
                            </TableCell>
                            <TableCell>{row.facilityName || '-'}</TableCell>
                            <TableCell className="text-sm">{row.address}</TableCell>
                            <TableCell>{row.orderVolume || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <FacilityMapPreview facilities={mockFacilities} />
        </div>
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface UploadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'upload' | 'mapping' | 'preview' | 'confirm';

interface ParsedItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  isValid: boolean;
  errors?: string[];
}

export function UploadForm({ onClose, onSuccess }: UploadFormProps) {
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedExtensions = ['.csv', '.xls', '.xlsx'];

  const validateFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptedExtensions.includes(fileExtension);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate file processing with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(i);
    }

    // Mock parsed items - in real implementation, this would parse the CSV/Excel
    const mockItems: ParsedItem[] = [
      { id: '1', item_name: 'Paracetamol 500mg', quantity: 100, unit: 'tablets', isValid: true },
      { id: '2', item_name: 'Amoxicillin 250mg', quantity: 50, unit: 'capsules', isValid: true },
      { id: '3', item_name: 'Invalid Item', quantity: -5, unit: '', isValid: false, errors: ['Quantity must be positive', 'Unit is required'] },
      { id: '4', item_name: 'Ibuprofen 400mg', quantity: 75, unit: 'tablets', isValid: true },
    ];

    setParsedItems(mockItems);
    setIsProcessing(false);
    setStep('preview');
  };

  const handleFile = useCallback((uploadedFile: File) => {
    if (validateFile(uploadedFile)) {
      setFile(uploadedFile);
      processFile(uploadedFile);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const removeItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    // In real implementation, this would create the requisition
    onSuccess();
  };

  const validItemsCount = parsedItems.filter(item => item.isValid).length;
  const invalidItemsCount = parsedItems.filter(item => !item.isValid).length;

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file containing requisition items. The system will parse and map the data.
          </p>

          <div
            className={cn(
              'h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-upload-wizard')?.click()}
          >
            <input
              id="file-upload-wizard"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className={cn('h-12 w-12 mb-4', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            {isDragging ? (
              <p className="text-primary font-medium">Drop the file here...</p>
            ) : (
              <>
                <p className="font-medium">Drag and drop a file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-4">Supports CSV, XLS, XLSX</p>
              </>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{file?.name}</span>
              </div>
              <Badge variant="secondary">{parsedItems.length} items</Badge>
            </div>

            <div className="flex items-center gap-2">
              {validItemsCount > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  {validItemsCount} valid
                </Badge>
              )}
              {invalidItemsCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {invalidItemsCount} invalid
                </Badge>
              )}
            </div>
          </div>

          <ScrollArea className="h-64 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedItems.map((item) => (
                  <TableRow key={item.id} className={!item.isValid ? 'bg-red-50' : ''}>
                    <TableCell>
                      {item.isValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.item_name}</span>
                        {item.errors && (
                          <p className="text-xs text-red-600 mt-1">
                            {item.errors.join(', ')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {invalidItemsCount > 0 && (
            <p className="text-sm text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Invalid items will be excluded from the requisition.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep('upload');
                setFile(null);
                setParsedItems([]);
              }}
            >
              Upload Different File
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={validItemsCount === 0}
            >
              Create Requisition ({validItemsCount} items)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

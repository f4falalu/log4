import { useState } from 'react';
import { Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCreateRequisition } from '@/hooks/useRequisitions';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { RequisitionPriority } from '@/types/requisitions';
import { FileUploadZone } from './components/FileUploadZone';
import { ParsedItemsPreview } from './components/ParsedItemsPreview';
import { BatchSizeWarning } from './components/BatchSizeWarning';
import { CSVTemplateButton } from './components/CSVTemplateButton';
import { parseCSV, ParsedRequisitionItem } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStep = 'upload' | 'preview' | 'details';

export function UploadRequisitionDialog({ open, onOpenChange }: UploadRequisitionDialogProps) {
  const { data: facilitiesData } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const createRequisition = useCreateRequisition();

  const facilities = facilitiesData?.facilities || [];

  const [step, setStep] = useState<UploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedRequisitionItem[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showBatchWarning, setShowBatchWarning] = useState(false);

  // Form state
  const [facilityId, setFacilityId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [priority, setPriority] = useState<RequisitionPriority>('medium');
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setParseErrors([]);
    setParseWarnings([]);

    try {
      if (file.name.endsWith('.csv')) {
        // Parse CSV file
        const result = await parseCSV(file);
        
        if (result.errors.length > 0) {
          setParseErrors(result.errors);
          toast.error('Failed to parse CSV file');
        } else {
          setParsedItems(result.items);
          setParseWarnings(result.warnings);
          setStep('preview');
          toast.success(`Successfully parsed ${result.items.length} items`);
        }
      } else if (file.name.endsWith('.pdf')) {
        // Parse PDF file via Edge Function
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('parse-requisition-pdf', {
          body: formData,
        });

        if (error) {
          setParseErrors([`Failed to parse PDF: ${error.message}`]);
          toast.error('Failed to parse PDF file');
        } else if (data.success && data.items) {
          setParsedItems(data.items);
          setParseWarnings(data.warnings || []);
          setStep('preview');
          toast.success(`Successfully parsed ${data.items.length} items from PDF`);
        } else {
          setParseErrors(['No items found in PDF file']);
          toast.error('No items found in PDF');
        }
      }
    } catch (error) {
      console.error('File parsing error:', error);
      setParseErrors([`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToDetails = () => {
    if (parsedItems.length >= 50) {
      setShowBatchWarning(true);
    } else {
      setStep('details');
    }
  };

  const handleBatchWarningConfirm = () => {
    setShowBatchWarning(false);
    setStep('details');
  };

  const handleSubmit = () => {
    const validItems = parsedItems.filter(
      item => item.item_name.trim() && item.quantity > 0
    );

    if (!facilityId || !warehouseId || !requestedDate || validItems.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    createRequisition.mutate({
      facility_id: facilityId,
      warehouse_id: warehouseId,
      priority,
      requested_delivery_date: requestedDate,
      notes,
      items: validItems,
    }, {
      onSuccess: () => {
        toast.success('Requisition created successfully');
        handleClose();
      },
      onError: (error) => {
        toast.error(`Failed to create requisition: ${error.message}`);
      },
    });
  };

  const handleClose = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedItems([]);
    setParseWarnings([]);
    setParseErrors([]);
    setFacilityId('');
    setWarehouseId('');
    setPriority('medium');
    setRequestedDate('');
    setNotes('');
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('upload');
      setSelectedFile(null);
      setParsedItems([]);
      setParseWarnings([]);
      setParseErrors([]);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Upload Requisition
              {step === 'preview' && ' - Review Items'}
              {step === 'details' && ' - Requisition Details'}
            </DialogTitle>
            <DialogDescription>
              {step === 'upload' && 'Upload a CSV or PDF file containing your requisition items'}
              {step === 'preview' && 'Review and edit the parsed items before proceeding'}
              {step === 'details' && 'Complete the requisition details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Upload File</h3>
                    <p className="text-xs text-muted-foreground">
                      Select a CSV or PDF file containing requisition items
                    </p>
                  </div>
                  <CSVTemplateButton />
                </div>

                <FileUploadZone onFileSelect={handleFileSelect} />

                {selectedFile && isProcessing && (
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Processing file...</p>
                      <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                    </div>
                  </div>
                )}

                {parseErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4" role="alert">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-destructive mb-1">
                          Parsing Errors
                        </h4>
                        <ul className="text-sm text-destructive space-y-1">
                          {parseErrors.map((error, idx) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="text-sm font-medium mb-2">File Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CSV files: Must contain columns for item_name and quantity</li>
                    <li>• PDF files: Should contain structured item lists or tables</li>
                    <li>• Maximum file size: 10 MB (CSV), 10 MB (PDF)</li>
                    <li>• Optional columns: unit, weight_kg, volume_m3, temperature_required, handling_instructions</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && (
              <ParsedItemsPreview
                items={parsedItems}
                warnings={parseWarnings}
                onChange={setParsedItems}
              />
            )}

            {/* Step 3: Details */}
            {step === 'details' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">
                    {parsedItems.length} items ready for requisition
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="facility">Facility *</Label>
                    <Select value={facilityId} onValueChange={setFacilityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map((facility) => (
                          <SelectItem key={facility.id} value={facility.id}>
                            {facility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse *</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value) => setPriority(value as RequisitionPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Requested Delivery Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes or special instructions..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={step === 'upload' ? handleClose : handleBack}
              >
                {step === 'upload' ? 'Cancel' : 'Back'}
              </Button>

              {step === 'preview' && (
                <Button
                  onClick={handleContinueToDetails}
                  disabled={parsedItems.length === 0}
                >
                  Continue to Details
                </Button>
              )}

              {step === 'details' && (
                <Button
                  onClick={handleSubmit}
                  disabled={!facilityId || !warehouseId || !requestedDate || createRequisition.isPending}
                >
                  {createRequisition.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Requisition
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BatchSizeWarning
        open={showBatchWarning}
        onOpenChange={setShowBatchWarning}
        itemCount={parsedItems.length}
        onConfirm={handleBatchWarningConfirm}
      />
    </>
  );
}

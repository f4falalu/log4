import { useState } from 'react';
import { FileText, Upload, PenLine, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InvoiceCreationMode } from '@/types/invoice';

interface NewInvoiceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInvoiceWizard({ open, onOpenChange }: NewInvoiceWizardProps) {
  const [step, setStep] = useState<'mode' | 'form'>('mode');
  const [selectedMode, setSelectedMode] = useState<InvoiceCreationMode | null>(null);

  const handleModeSelect = (mode: InvoiceCreationMode) => {
    setSelectedMode(mode);
    setStep('form');
  };

  const handleBack = () => {
    setStep('mode');
    setSelectedMode(null);
  };

  const handleClose = () => {
    setStep('mode');
    setSelectedMode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'form' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-6 w-6">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'mode' ? 'Create New Invoice' : getModeTitle(selectedMode)}
          </DialogTitle>
        </DialogHeader>

        {step === 'mode' && (
          <ModeSelector onSelect={handleModeSelect} />
        )}

        {step === 'form' && selectedMode === 'ready_request' && (
          <ReadyRequestForm onClose={handleClose} />
        )}

        {step === 'form' && selectedMode === 'upload_file' && (
          <UploadFileForm onClose={handleClose} />
        )}

        {step === 'form' && selectedMode === 'manual_entry' && (
          <ManualEntryForm onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function getModeTitle(mode: InvoiceCreationMode | null): string {
  switch (mode) {
    case 'ready_request':
      return 'Create from Ready Request';
    case 'upload_file':
      return 'Upload Invoice File';
    case 'manual_entry':
      return 'Manual Invoice Entry';
    default:
      return 'Create New Invoice';
  }
}

interface ModeSelectorProps {
  onSelect: (mode: InvoiceCreationMode) => void;
}

function ModeSelector({ onSelect }: ModeSelectorProps) {
  const modes: { mode: InvoiceCreationMode; icon: React.ComponentType<{ className?: string }>; title: string; description: string }[] = [
    {
      mode: 'ready_request',
      icon: FileText,
      title: 'Ready Request',
      description: 'Load finalized requisitions that are ready for invoicing',
    },
    {
      mode: 'upload_file',
      icon: Upload,
      title: 'Upload File',
      description: 'Upload a CSV or document file with invoice data',
    },
    {
      mode: 'manual_entry',
      icon: PenLine,
      title: 'Manual Entry',
      description: 'Manually enter invoice details and line items',
    },
  ];

  return (
    <div className="grid gap-4 py-4">
      {modes.map(({ mode, icon: Icon, title, description }) => (
        <Card
          key={mode}
          className={cn(
            'cursor-pointer hover:border-primary transition-colors'
          )}
          onClick={() => onSelect(mode)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm">{description}</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

interface FormProps {
  onClose: () => void;
}

function ReadyRequestForm({ onClose }: FormProps) {
  return (
    <div className="py-4 space-y-4">
      <p className="text-muted-foreground">
        Select from approved requisitions to create an invoice.
      </p>

      <div className="h-64 border rounded-lg flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No ready requisitions available</p>
          <p className="text-sm">Approved requisitions will appear here</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled>
          Create Invoice
        </Button>
      </div>
    </div>
  );
}

function UploadFileForm({ onClose }: FormProps) {
  return (
    <div className="py-4 space-y-4">
      <p className="text-muted-foreground">
        Upload a CSV or document file containing invoice data.
      </p>

      <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Drag and drop a file here</p>
          <p className="text-sm">or click to browse</p>
          <p className="text-xs mt-2">Supports CSV, XLS, XLSX</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled>
          Process File
        </Button>
      </div>
    </div>
  );
}

function ManualEntryForm({ onClose }: FormProps) {
  return (
    <div className="py-4 space-y-4">
      <p className="text-muted-foreground">
        Manually enter invoice details and add line items.
      </p>

      <div className="h-64 border rounded-lg p-4 overflow-auto">
        <div className="text-center text-muted-foreground py-8">
          <PenLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Manual entry form coming soon</p>
          <p className="text-sm">This feature is under development</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled>
          Create Invoice
        </Button>
      </div>
    </div>
  );
}

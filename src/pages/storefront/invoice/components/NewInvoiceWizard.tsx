import { useState } from 'react';
import { FileText, Upload, PenLine, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { InvoiceCreationMode } from '@/types/invoice';
import { ManualEntryForm } from './ManualEntryForm';
import { ReadyRequestForm } from './ReadyRequestForm';
import { UploadFileForm } from './UploadFileForm';

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
      <DialogContent className={cn(
        'max-h-[90vh] flex flex-col',
        step === 'form' ? 'max-w-4xl' : 'max-w-2xl'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'form' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-6 w-6">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'mode' ? 'Create New Invoice' : getModeTitle(selectedMode)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 'mode' ? 'Choose how to create your invoice' : `Create invoice via ${getModeTitle(selectedMode).toLowerCase()}`}
          </DialogDescription>
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
      description: 'Upload a CSV or Excel file with invoice data',
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

import { useState } from 'react';
import { List, Upload, FlaskConical, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FacilityListRouteForm } from './FacilityListRouteForm';
import { UploadRouteForm } from './UploadRouteForm';
import { SandboxRouteForm } from './SandboxRouteForm';
import type { RouteCreationMode } from '@/types/routes';

const MODES = [
  {
    id: 'facility_list' as RouteCreationMode,
    title: 'From Facility List',
    description: 'Select facilities from existing service areas for production route planning.',
    icon: List,
  },
  {
    id: 'upload' as RouteCreationMode,
    title: 'Upload Facilities',
    description: 'Upload a CSV with facility coordinates for rapid route expansion.',
    icon: Upload,
  },
  {
    id: 'sandbox' as RouteCreationMode,
    title: 'Sandbox',
    description: 'Simulate and analyze routes without writing to production.',
    icon: FlaskConical,
  },
];

interface CreateRouteWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRouteWizard({ open, onOpenChange }: CreateRouteWizardProps) {
  const [selectedMode, setSelectedMode] = useState<RouteCreationMode | null>(null);

  const handleClose = (open: boolean) => {
    if (!open) setSelectedMode(null);
    onOpenChange(open);
  };

  const handleBack = () => setSelectedMode(null);

  const handleSuccess = () => {
    setSelectedMode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedMode && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {selectedMode
                  ? MODES.find(m => m.id === selectedMode)?.title || 'New Route'
                  : 'New Route'}
              </DialogTitle>
              <DialogDescription>
                {selectedMode
                  ? MODES.find(m => m.id === selectedMode)?.description
                  : 'Choose how you want to create a route.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!selectedMode ? (
          <div className="grid gap-4 md:grid-cols-3 py-4">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <Card
                  key={mode.id}
                  className="cursor-pointer hover:shadow-md transition-all hover:ring-1 hover:ring-primary/50"
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-sm">{mode.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs">
                      {mode.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {selectedMode === 'facility_list' && (
              <FacilityListRouteForm onSuccess={handleSuccess} />
            )}
            {selectedMode === 'upload' && (
              <UploadRouteForm onSuccess={handleSuccess} />
            )}
            {selectedMode === 'sandbox' && (
              <SandboxRouteForm onSuccess={handleSuccess} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScheduleWizard } from '@/hooks/useScheduleWizard';
import { Step1SourceSelector } from './Step1SourceSelector';
import { Step2ModeSelector } from './Step2ModeSelector';
import { Step3AManualGrouping } from './Step3AManualGrouping';
import { Step3BOptimizationSetup } from './Step3BOptimizationSetup';
import { Step4ReviewConfirm } from './Step4ReviewConfirm';
import { ExcelUploadStep } from './ExcelUploadStep';
import { useCreateSchedule } from '@/hooks/useDeliverySchedules';
import { useWarehouses } from '@/hooks/useWarehouses';
import { toast } from 'sonner';

interface ScheduleAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleAssistantDialog({ open, onOpenChange }: ScheduleAssistantDialogProps) {
  const wizard = useScheduleWizard();
  const { data: warehouses = [] } = useWarehouses();
  const createSchedule = useCreateSchedule();

  const handleConfirm = async () => {
    try {
      for (const batch of wizard.state.batches) {
        await createSchedule.mutateAsync({
          title: batch.name,
          warehouse_id: warehouses[0]?.id || '',
          planned_date: new Date().toISOString().split('T')[0],
          time_window: 'all_day',
          status: 'draft',
          total_payload_kg: 0,
          total_volume_m3: 0,
          facility_ids: batch.facilityIds,
          optimization_method: wizard.state.mode === 'ai_optimized' ? 'ai_optimized' : 'manual',
        });
      }
      
      toast.success('Schedule created — visible in FleetOps Tactical Map');
      wizard.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const canProceed = () => {
    if (wizard.state.step === 1) return !!wizard.state.source;
    if (wizard.state.step === 2) return !!wizard.state.mode;
    if (wizard.state.step === 3) return wizard.state.batches.length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step {wizard.state.step} of 4</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-12 rounded-full ${
                    step <= wizard.state.step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          {wizard.state.step === 1 && <Step1SourceSelector onSelect={wizard.setSource} />}
          {wizard.state.step === 2 && <Step2ModeSelector onSelect={wizard.setMode} />}
          {wizard.state.step === 3 && wizard.state.source === 'upload' && (
            <ExcelUploadStep onDataParsed={(data) => wizard.nextStep()} />
          )}
          {wizard.state.step === 3 && wizard.state.mode === 'manual' && wizard.state.source !== 'upload' && (
            <Step3AManualGrouping
              selectedFacilities={wizard.state.selectedFacilities}
              onFacilitySelect={wizard.setSelectedFacilities}
              onCreateBatch={wizard.addBatch}
            />
          )}
          {wizard.state.step === 3 && wizard.state.mode === 'ai_optimized' && (
            <Step3BOptimizationSetup
              warehouseId={warehouses[0]?.id || ''}
              facilityIds={wizard.state.selectedFacilities}
              optimizationParams={wizard.state.optimizationParams}
              onParamsChange={wizard.setOptimizationParams}
              onBatchesGenerated={wizard.setBatches}
            />
          )}
          {wizard.state.step === 4 && (
            <Step4ReviewConfirm
              batches={wizard.state.batches}
              onEditBatch={(id) => wizard.goToStep(3)}
              onConfirm={handleConfirm}
              isSubmitting={createSchedule.isPending}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={wizard.prevStep}
              disabled={wizard.state.step === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            {wizard.state.step < 4 ? (
              <Button
                onClick={wizard.nextStep}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

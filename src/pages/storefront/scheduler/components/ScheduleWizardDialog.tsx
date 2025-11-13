/**
 * =====================================================
 * Schedule Wizard Dialog Component
 * =====================================================
 * Multi-step wizard dialog for creating new schedules
 */

import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSchedulerWizardStore } from '@/stores/schedulerWizardStore';
import { useCreateSchedulerBatch } from '@/hooks/useSchedulerBatches';
import { toast } from 'sonner';
import { WizardStep1SourceSelection } from './wizard/WizardStep1SourceSelection';
import { WizardStep2ModeSelection } from './wizard/WizardStep2ModeSelection';
import { WizardStep3Scheduling } from './wizard/WizardStep3Scheduling';
import { WizardStep4Review } from './wizard/WizardStep4Review';

interface ScheduleWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { number: 1, title: 'Source' },
  { number: 2, title: 'Mode' },
  { number: 3, title: 'Schedule' },
  { number: 4, title: 'Review' },
];

export function ScheduleWizardDialog({
  open,
  onOpenChange,
}: ScheduleWizardDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = useSchedulerWizardStore((state) => state.current_step);
  const canProceed = useSchedulerWizardStore((state) =>
    state.canProceedToNextStep()
  );

  // Get all schedule data from store
  const scheduleTitle = useSchedulerWizardStore((state) => state.schedule_title);
  const warehouseId = useSchedulerWizardStore((state) => state.warehouse_id);
  const plannedDate = useSchedulerWizardStore((state) => state.planned_date);
  const timeWindow = useSchedulerWizardStore((state) => state.time_window);
  const vehicleId = useSchedulerWizardStore((state) => state.vehicle_id);
  const driverId = useSchedulerWizardStore((state) => state.driver_id);
  const notes = useSchedulerWizardStore((state) => state.notes);
  const selectedFacilities = useSchedulerWizardStore((state) => state.selected_facilities);
  const schedulingMode = useSchedulerWizardStore((state) => state.scheduling_mode);

  const { nextStep, previousStep, resetWizard } = useSchedulerWizardStore();
  const createBatch = useCreateSchedulerBatch();

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (canProceed) {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleFinish = async () => {
    // Validate required fields
    console.log('=== Schedule Creation Debug ===');
    console.log('Schedule Title:', scheduleTitle);
    console.log('Warehouse ID:', warehouseId);
    console.log('Planned Date:', plannedDate);
    console.log('Selected Facilities:', selectedFacilities);
    console.log('Time Window:', timeWindow);
    console.log('Scheduling Mode:', schedulingMode);
    console.log('Driver ID:', driverId);
    console.log('Vehicle ID:', vehicleId);
    console.log('Notes:', notes);

    if (!scheduleTitle || !warehouseId || !plannedDate || selectedFacilities.length === 0) {
      const missingFields = [];
      if (!scheduleTitle) missingFields.push('Schedule Title');
      if (!warehouseId) missingFields.push('Warehouse');
      if (!plannedDate) missingFields.push('Planned Date');
      if (selectedFacilities.length === 0) missingFields.push('Facilities');

      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: scheduleTitle,
        warehouse_id: warehouseId,
        facility_ids: selectedFacilities,
        planned_date: plannedDate,
        time_window: timeWindow,
        driver_id: driverId,
        vehicle_id: vehicleId,
        notes: notes,
        status: 'draft' as const,
        scheduling_mode: schedulingMode || 'manual',
        priority: 'medium' as const,
      };

      console.log('Mutation payload:', JSON.stringify(payload, null, 2));

      // Create scheduler_batch record
      const result = await createBatch.mutateAsync(payload);
      console.log('Schedule created successfully:', result);

      toast.success('Schedule created successfully!');
      handleClose();
    } catch (error: any) {
      console.error('=== Schedule Creation Error ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      console.error('Full error:', JSON.stringify(error, null, 2));

      const errorMessage = error?.message || 'Failed to create schedule. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Schedule Assistant</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className={`flex items-center gap-2 ${
                    currentStep >= step.number
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : currentStep === step.number
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {currentStep === 1 && <WizardStep1SourceSelection />}
          {currentStep === 2 && <WizardStep2ModeSelection />}
          {currentStep === 3 && <WizardStep3Scheduling />}
          {currentStep === 4 && <WizardStep4Review />}
        </div>

        {/* Footer */}
        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext} disabled={!canProceed}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={!canProceed || isSubmitting}>
                  <Check className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Creating...' : 'Create Schedule'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

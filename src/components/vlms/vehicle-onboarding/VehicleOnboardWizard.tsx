/**
 * VLMS Vehicle Onboarding - Main Wizard Component
 * Multi-step wizard for onboarding new vehicles
 */

import { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CategorySelector } from './CategorySelector';
import { SubcategoryCarousel } from './SubcategoryCarousel';
import { CapacityConfigurator } from './CapacityConfigurator';
import { RegistrationForm } from './RegistrationForm';
import { VehicleOnboardSummary } from './VehicleOnboardSummary';
import { useVehicleOnboardState } from '@/hooks/useVehicleOnboardState';
import { ONBOARDING_STEPS } from '@/types/vlms-onboarding';
import type { OnboardingStep } from '@/types/vlms-onboarding';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

export function VehicleOnboardWizard() {
  const currentStep = useVehicleOnboardState((state) => state.currentStep);
  const reset = useVehicleOnboardState((state) => state.reset);

  // Reset wizard on mount
  useEffect(() => {
    reset();
  }, [reset]);

  // Get current step index
  const currentStepIndex = ONBOARDING_STEPS.findIndex((step) => step.id === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  // Render current step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 'category':
        return <CategorySelector />;
      case 'type':
        return <SubcategoryCarousel />;
      case 'capacity':
        return <CapacityConfigurator />;
      case 'registration':
        return <RegistrationForm />;
      case 'review':
        return <VehicleOnboardSummary />;
      default:
        return <CategorySelector />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Onboard New Vehicle</h1>
            <p className="text-muted-foreground">
              Follow the steps to register a new vehicle in the system
            </p>
          </div>

          <Badge variant="outline" className="text-sm">
            Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />

          {/* Step Indicators */}
          <div className="flex items-center justify-between gap-2">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = LucideIcons[step.icon as keyof typeof LucideIcons] as any;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                    'flex-1 text-sm',
                    isActive && 'bg-primary text-primary-foreground font-medium',
                    isCompleted && 'bg-green-100 text-green-700',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[600px]">{renderStepContent()}</div>
    </div>
  );
}

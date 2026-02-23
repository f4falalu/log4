import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingWizard } from '@/hooks/onboarding/useOnboardingWizard';
import OnboardingStepperSidebar from './OnboardingStepperSidebar';
import OrganizationStep from './steps/OrganizationStep';
import TeamSetupStep from './steps/TeamSetupStep';
import DataImportStep from './steps/DataImportStep';
import FleetSetupStep from './steps/FleetSetupStep';
import LaunchStep from './steps/LaunchStep';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export default function OnboardingWizardV2() {
  const { user } = useAuth();
  const wizard = useOnboardingWizard();
  const [resendingEmail, setResendingEmail] = useState(false);

  // Loading state
  if (wizard.isLoadingStatus) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-zinc-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Check email verification
  const isEmailVerified = user?.email_confirmed_at || user?.confirmed_at;
  if (!isEmailVerified) {
    const handleResendVerification = async () => {
      setResendingEmail(true);
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user?.email || '',
        });
        if (error) throw error;
        toast.success('Verification email sent', {
          description: 'Please check your inbox.',
        });
      } catch {
        toast.error('Failed to resend verification email');
      } finally {
        setResendingEmail(false);
      }
    };

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md text-center space-y-6 px-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">Verify Your Email</h1>
            <p className="text-zinc-400">
              Please verify your email address before setting up your organization.
              Check your inbox for a verification link sent to{' '}
              <strong className="text-white">{user?.email}</strong>.
            </p>
          </div>
          <Button
            onClick={handleResendVerification}
            disabled={resendingEmail}
            variant="outline"
            className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
          >
            {resendingEmail ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Resend Verification Email
          </Button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (wizard.state.currentStep) {
      case 'organization':
        return <OrganizationStep wizard={wizard} />;
      case 'team':
        return <TeamSetupStep wizard={wizard} />;
      case 'data_import':
        return <DataImportStep wizard={wizard} />;
      case 'fleet':
        return <FleetSetupStep wizard={wizard} />;
      case 'launch':
        return <LaunchStep wizard={wizard} />;
      default:
        return <OrganizationStep wizard={wizard} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left sidebar stepper */}
      <OnboardingStepperSidebar
        currentStep={wizard.state.currentStep}
        completedSteps={wizard.state.completedSteps}
        onStepClick={wizard.goToStep}
      />

      {/* Right content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

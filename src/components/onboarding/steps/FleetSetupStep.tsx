import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Loader2, SkipForward, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { useOnboardingWizard } from '@/hooks/onboarding/useOnboardingWizard';

interface FleetSetupStepProps {
  wizard: ReturnType<typeof useOnboardingWizard>;
}

export default function FleetSetupStep({ wizard }: FleetSetupStepProps) {
  const { state, skipStep, saveStepProgress, goNext } = wizard;
  const [showForm, setShowForm] = useState(false);
  const [vehicleCreated, setVehicleCreated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle form
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');

  const handleCreateVehicle = async () => {
    if (!plateNumber.trim() || !state.workspaceId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        plate_number: plateNumber.trim().toUpperCase(),
        vehicle_type: vehicleType.trim() || null,
        make: vehicleMake.trim() || null,
        workspace_id: state.workspaceId,
        status: 'active',
      });
      if (error) throw error;

      setVehicleCreated(true);
      setShowForm(false);
      toast.success('Vehicle Added', {
        description: `${plateNumber.toUpperCase()} has been added to your fleet.`,
      });
    } catch (error) {
      toast.error('Failed to add vehicle', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    await saveStepProgress('launch');
    goNext();
  };

  const handleSkip = async () => {
    await saveStepProgress('launch');
    skipStep();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-4">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Add Your First Vehicle</h1>
        <p className="text-zinc-400">
          Register a vehicle in your fleet. You can add more later from Fleet Management.
        </p>
      </div>

      {!showForm && !vehicleCreated && (
        <div className="space-y-4">
          <Card
            className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
            onClick={() => setShowForm(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-violet-400" />
                <div>
                  <CardTitle className="text-white text-base">Add Vehicle</CardTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">Register your first delivery vehicle</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Button
            onClick={handleSkip}
            variant="ghost"
            className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip for Now
          </Button>
        </div>
      )}

      {vehicleCreated && !showForm && (
        <Card className="bg-emerald-500/5 border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base">Vehicle Added</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">{plateNumber.toUpperCase()} is ready</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Add Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">
                Plate Number <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g., KAN-123-AB"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Vehicle Type <span className="text-zinc-600">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g., Van, Truck, Pickup"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Make <span className="text-zinc-600">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g., Toyota, Ford"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateVehicle}
                disabled={!plateNumber.trim() || isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        {!vehicleCreated && !showForm ? null : (
          <>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-zinc-400 hover:text-white"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

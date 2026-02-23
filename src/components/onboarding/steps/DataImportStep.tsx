import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Building, Loader2, SkipForward, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { useOnboardingWizard } from '@/hooks/onboarding/useOnboardingWizard';

interface DataImportStepProps {
  wizard: ReturnType<typeof useOnboardingWizard>;
}

export default function DataImportStep({ wizard }: DataImportStepProps) {
  const { state, skipStep, saveStepProgress, goNext } = wizard;
  const [activeForm, setActiveForm] = useState<'warehouse' | 'facility' | null>(null);
  const [warehouseCreated, setWarehouseCreated] = useState(false);
  const [facilityCreated, setFacilityCreated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warehouse form
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');

  // Facility form
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('');

  const handleCreateWarehouse = async () => {
    if (!warehouseName.trim() || !state.workspaceId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('warehouses').insert({
        name: warehouseName.trim(),
        address: warehouseAddress.trim() || null,
        workspace_id: state.workspaceId,
      });
      if (error) throw error;

      setWarehouseCreated(true);
      setActiveForm(null);
      toast.success('Warehouse Created', {
        description: `${warehouseName} has been added to your workspace.`,
      });
    } catch (error) {
      toast.error('Failed to create warehouse', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFacility = async () => {
    if (!facilityName.trim() || !state.workspaceId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('facilities').insert({
        name: facilityName.trim(),
        facility_type: facilityType.trim() || null,
        workspace_id: state.workspaceId,
      });
      if (error) throw error;

      setFacilityCreated(true);
      setActiveForm(null);
      toast.success('Facility Created', {
        description: `${facilityName} has been added to your workspace.`,
      });
    } catch (error) {
      toast.error('Failed to create facility', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    await saveStepProgress('fleet');
    goNext();
  };

  const handleSkip = async () => {
    await saveStepProgress('fleet');
    skipStep();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center mb-4">
          <Warehouse className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-white">Add Your Locations</h1>
        <p className="text-zinc-400">
          Set up your first warehouse and facility. You can add more later.
        </p>
      </div>

      {/* Tile cards */}
      {!activeForm && (
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-colors ${
              warehouseCreated
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'hover:border-zinc-700'
            }`}
            onClick={() => !warehouseCreated && setActiveForm('warehouse')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Warehouse className="w-8 h-8 text-orange-400" />
                {warehouseCreated && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <CardTitle className="text-white text-base">Create Warehouse</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                {warehouseCreated
                  ? 'Warehouse created successfully'
                  : 'Add your first warehouse location'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-colors ${
              facilityCreated
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'hover:border-zinc-700'
            }`}
            onClick={() => !facilityCreated && setActiveForm('facility')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Building className="w-8 h-8 text-blue-400" />
                {facilityCreated && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <CardTitle className="text-white text-base">Create Facility</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                {facilityCreated
                  ? 'Facility created successfully'
                  : 'Add your first delivery facility'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Warehouse form */}
      {activeForm === 'warehouse' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Create Warehouse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">
                Warehouse Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g., Kano Central Warehouse"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">
                Address <span className="text-zinc-600">(optional)</span>
              </Label>
              <Input
                placeholder="Street address"
                value={warehouseAddress}
                onChange={(e) => setWarehouseAddress(e.target.value)}
                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setActiveForm(null)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWarehouse}
                disabled={!warehouseName.trim() || isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Warehouse
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facility form */}
      {activeForm === 'facility' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Create Facility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">
                Facility Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g., Nassarawa General Hospital"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">
                Facility Type <span className="text-zinc-600">(optional)</span>
              </Label>
              <Input
                placeholder="e.g., Hospital, Clinic, PHC"
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value)}
                className="h-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setActiveForm(null)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFacility}
                disabled={!facilityName.trim() || isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Facility
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
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
      </div>
    </div>
  );
}

/**
 * ScenarioDialog
 *
 * Dialog for scenario simulation configuration.
 * Allows users to test what-if scenarios for planning.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, RotateCcw, Truck, Building2 } from 'lucide-react';
import { useState } from 'react';

interface ScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScenarioDialog({ open, onOpenChange }: ScenarioDialogProps) {
  const [fleetCapacity, setFleetCapacity] = useState([100]);
  const [demandMultiplier, setDemandMultiplier] = useState([100]);

  const handleReset = () => {
    setFleetCapacity([100]);
    setDemandMultiplier([100]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scenario Simulation</DialogTitle>
          <DialogDescription>
            Configure what-if scenarios to test planning assumptions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Facility Actions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Facilities</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
              <Button variant="outline" size="sm" className="h-9">
                <Building2 className="mr-2 h-4 w-4" />
                Disable
              </Button>
            </div>
          </div>

          {/* Fleet Capacity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Fleet Capacity</Label>
              <span className="text-sm text-muted-foreground">{fleetCapacity[0]}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={fleetCapacity}
                onValueChange={setFleetCapacity}
                max={150}
                min={50}
                step={5}
                className="flex-1"
              />
            </div>
          </div>

          {/* Demand Multiplier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Demand Multiplier</Label>
              <span className="text-sm text-muted-foreground">{demandMultiplier[0]}%</span>
            </div>
            <Slider
              value={demandMultiplier}
              onValueChange={setDemandMultiplier}
              max={200}
              min={50}
              step={10}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Apply Scenario
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

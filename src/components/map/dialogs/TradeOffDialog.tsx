/**
 * TradeOffDialog Component
 *
 * Multi-step dialog for Trade-Off workflow
 * Trade-Off is the ONLY reassignment mechanism
 *
 * Steps:
 * 1. Select receiving vehicles (manual selection ONLY)
 * 2. Set handover point (map picker)
 * 3. Allocate items to receivers (item-level)
 * 4. Confirm with all parties (source + receivers)
 * 5. Execute Trade-Off
 *
 * Critical: NO auto-matching, NO optimization, manual selection only
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTradeOff } from '@/hooks/useTradeOff';
import { ArrowRight, X, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TradeOffDialog() {
  const {
    isDialogOpen,
    state,
    sourceVehicleId,
    receivingVehicleIds,
    handoverPoint,
    items,
    confirmations,
    closeDialog,
    reset,
    executeTradeOff,
    cancelTradeOff,
  } = useTradeOff();

  const [currentStep, setCurrentStep] = useState(1);

  const handleClose = () => {
    closeDialog();
    reset();
    setCurrentStep(1);
  };

  const handleExecute = async () => {
    try {
      await executeTradeOff();
      handleClose();
    } catch (error) {
      console.error('Failed to execute Trade-Off:', error);
    }
  };

  const handleCancel = () => {
    cancelTradeOff();
    handleClose();
  };

  // State badge color mapping
  const getStateBadgeColor = (currentState: typeof state) => {
    switch (currentState) {
      case 'initiated':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'receivers_selected':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'allocation_complete':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'confirmations_pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'all_confirmed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'executed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Trade-Off Workflow
            </DialogTitle>
            <Badge className={cn('border', getStateBadgeColor(state))}>
              {state.replace(/_/g, ' ')}
            </Badge>
          </div>
          <DialogDescription>
            Manual reassignment mechanism with multi-party confirmation
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Progress Steps */}
        <div className="flex items-center justify-between py-4">
          {[
            { step: 1, label: 'Select Vehicles' },
            { step: 2, label: 'Handover Point' },
            { step: 3, label: 'Allocate Items' },
            { step: 4, label: 'Confirmations' },
          ].map(({ step, label }, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium',
                  currentStep >= step
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {step}
              </div>
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {label}
              </span>
              {index < 3 && (
                <ArrowRight className="mx-4 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step Content */}
        <div className="py-6 min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Receiving Vehicles</h3>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-600">
                      Manual Selection Only
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-matching and optimization are disabled. You must manually
                      select receiving vehicles.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Source Vehicle: <span className="font-medium">{sourceVehicleId}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Receiving Vehicles:{' '}
                  {receivingVehicleIds.length > 0 ? (
                    receivingVehicleIds.join(', ')
                  ) : (
                    <span className="italic">None selected</span>
                  )}
                </p>
              </div>

              {/* TODO: Add vehicle selection component */}
              <div className="border border-dashed rounded-lg p-8 text-center bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Vehicle selection component placeholder
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Implementation: Week 2
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Set Handover Point</h3>
              <p className="text-sm text-muted-foreground">
                Click on the map to set the handover location
              </p>

              {handoverPoint ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Latitude:</span>{' '}
                    <span className="font-mono">{handoverPoint.lat.toFixed(6)}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Longitude:</span>{' '}
                    <span className="font-mono">{handoverPoint.lng.toFixed(6)}</span>
                  </p>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Map picker component placeholder
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Implementation: Week 2
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Allocate Items</h3>
              <p className="text-sm text-muted-foreground">
                Distribute items across receiving vehicles (item-level allocation)
              </p>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.itemId}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.itemName}</span>
                        <Badge variant="outline">
                          {item.originalQuantity} {item.unit}
                        </Badge>
                      </div>
                      {/* TODO: Add allocation sliders */}
                      <p className="text-xs text-muted-foreground">
                        Allocation controls: Implementation Week 2
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    No items to allocate
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Confirmations</h3>
              <p className="text-sm text-muted-foreground">
                All parties must confirm before execution
              </p>

              <div className="space-y-3">
                {confirmations.map((conf) => (
                  <div
                    key={conf.driverId}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{conf.driverName}</p>
                      <p className="text-xs text-muted-foreground">
                        {conf.role === 'source' ? 'Source Driver' : 'Receiving Driver'}
                      </p>
                    </div>
                    {conf.confirmed ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">Confirmed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm font-medium">Pending</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </Button>
            )}

            {currentStep < 4 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleExecute}
                disabled={state !== 'all_confirmed'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Execute Trade-Off
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

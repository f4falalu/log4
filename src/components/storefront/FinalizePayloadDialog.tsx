/**
 * =====================================================
 * DEPRECATED: FinalizePayloadDialog
 * =====================================================
 * RFC-012: This component is DEPRECATED and will be removed.
 *
 * VIOLATION: Storefront should NOT create delivery_batches directly.
 * This component bypassed the proper domain boundaries by:
 * 1. Creating delivery_batches from Storefront (should be FleetOps only)
 * 2. Selecting vehicles in Storefront (should be FleetOps only)
 *
 * MIGRATION PATH:
 * - Use the Scheduler workflow instead (scheduler_batches → ready → published)
 * - FleetOps will handle vehicle/driver assignment during batch planning
 *
 * This component now shows a deprecation notice instead of the form.
 * It will be deleted in the next release cycle.
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface FinalizePayloadDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
}

/**
 * @deprecated RFC-012: Use Scheduler workflow instead.
 * Storefront should not create delivery_batches directly.
 */
export function FinalizePayloadDialog({ open, onClose }: FinalizePayloadDialogProps) {
  // RFC-012: This dialog now shows a deprecation notice instead of the form
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Feature Deprecated
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              <strong>RFC-012:</strong> Direct payload finalization to FleetOps has been deprecated.
            </p>
            <p>
              This workflow violated domain boundaries by allowing Storefront to create delivery batches directly.
            </p>
            <p className="font-medium">
              Please use the Scheduler workflow instead:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to Storefront → Scheduler</li>
              <li>Create a new schedule with your facilities</li>
              <li>Publish to FleetOps when ready</li>
              <li>FleetOps will assign vehicles and drivers</li>
            </ol>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

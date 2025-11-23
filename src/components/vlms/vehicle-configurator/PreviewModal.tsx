/**
 * Preview Modal Component
 * Shows summary of vehicle configuration before saving
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatVolume, formatWeight } from '@/lib/vlms/capacityCalculations';
import type { VehicleCategory } from '@/types/vlms-onboarding';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: VehicleCategory | null;
  dimensions: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    volume_m3?: number;
  };
  payload: {
    gross_weight_kg?: number;
    max_payload_kg?: number;
  };
  tiers: any[];
  onSave: () => void;
}

export function PreviewModal({
  open,
  onOpenChange,
  selectedCategory,
  dimensions,
  payload,
  tiers,
  onSave,
}: PreviewModalProps) {
  const silhouettePath = selectedCategory
    ? `/assets/vehicles/silhouettes/${selectedCategory.code}.webp`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Vehicle Configuration</DialogTitle>
          <DialogDescription>
            Review your vehicle configuration before saving
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Visual */}
          {silhouettePath && (
            <div className="flex justify-center p-6 bg-muted/20 rounded-lg">
              <img
                src={silhouettePath}
                alt={selectedCategory?.display_name || 'Vehicle'}
                className="max-h-[200px] object-contain"
              />
            </div>
          )}

          {/* Category Info */}
          {selectedCategory && (
            <div>
              <h3 className="font-semibold mb-2">Category</h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                  {selectedCategory.code}
                </span>
                <span>{selectedCategory.display_name || selectedCategory.name}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Dimensions */}
          <div>
            <h3 className="font-semibold mb-2">Dimensions</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Length:</span>
                <span className="ml-2 font-medium">{dimensions.length_cm || '-'} cm</span>
              </div>
              <div>
                <span className="text-muted-foreground">Width:</span>
                <span className="ml-2 font-medium">{dimensions.width_cm || '-'} cm</span>
              </div>
              <div>
                <span className="text-muted-foreground">Height:</span>
                <span className="ml-2 font-medium">{dimensions.height_cm || '-'} cm</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo Volume:</span>
                <span className="ml-2 font-medium">
                  {dimensions.volume_m3 ? formatVolume(dimensions.volume_m3) : '-'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payload */}
          <div>
            <h3 className="font-semibold mb-2">Payload Capacity</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gross Vehicle Weight:</span>
                <span className="ml-2 font-medium">
                  {payload.gross_weight_kg ? formatWeight(payload.gross_weight_kg) : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Payload:</span>
                <span className="ml-2 font-medium">
                  {payload.max_payload_kg ? formatWeight(payload.max_payload_kg) : '-'}
                </span>
              </div>
            </div>
          </div>

          {tiers.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Capacity Tiers</h3>
                <div className="space-y-2 text-sm">
                  {tiers.map((tier, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">{tier.name}:</span>
                      <span className="font-medium">{tier.slots} slots</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to Editing
          </Button>
          <Button onClick={onSave}>Save Vehicle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

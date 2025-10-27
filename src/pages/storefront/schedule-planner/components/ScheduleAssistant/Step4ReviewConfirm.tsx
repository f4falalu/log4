import { CheckCircle2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchCard } from './BatchCard';
import { BatchData } from '@/hooks/useScheduleWizard';

interface Step4ReviewConfirmProps {
  batches: BatchData[];
  onEditBatch: (batchId: string) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function Step4ReviewConfirm({
  batches,
  onEditBatch,
  onConfirm,
  isSubmitting,
}: Step4ReviewConfirmProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Review & Confirm Plan</h2>
          <p className="text-muted-foreground mt-1">
            Review your schedule before publishing to FleetOps
          </p>
        </div>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting || batches.length === 0}
          className="gap-2"
          size="lg"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSubmitting ? 'Creating...' : 'Confirm & Publish'}
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No batches created yet
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.id} className="group relative">
              <BatchCard batch={batch} />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                onClick={() => onEditBatch(batch.id)}
              >
                <Edit className="w-3 h-3" />
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Batches</span>
            <p className="font-semibold text-lg">{batches.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Facilities</span>
            <p className="font-semibold text-lg">
              {batches.reduce((sum, b) => sum + b.facilityIds.length, 0)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Est. Distance</span>
            <p className="font-semibold text-lg">
              {batches.reduce((sum, b) => sum + (b.estimatedDistance || 0), 0).toFixed(1)} mi
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Est. Duration</span>
            <p className="font-semibold text-lg">
              {Math.round(batches.reduce((sum, b) => sum + (b.estimatedDuration || 0), 0) / 60)}h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

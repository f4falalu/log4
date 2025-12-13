import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeliverySchedule } from '@/hooks/useDeliverySchedules';
import { useScheduleOptimization } from '@/hooks/useScheduleOptimization';
import { useUpdateSchedule } from '@/hooks/useDeliverySchedules';
import { Loader2, MapPin, Route, Clock } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: DeliverySchedule | null;
}

export function OptimizeDialog({
  open,
  onOpenChange,
  schedule
}: OptimizeDialogProps) {
  const optimize = useScheduleOptimization();
  const updateSchedule = useUpdateSchedule();
  const [optimizedResult, setOptimizedResult] = useState<any>(null);

  const handleOptimize = async () => {
    if (!schedule) return;

    try {
      const result = await optimize.mutateAsync({
        warehouseId: schedule.warehouse_id,
        facilityIds: schedule.facility_ids,
        vehicleType: schedule.vehicle?.model
      });
      setOptimizedResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  const handleAccept = async () => {
    if (!schedule || !optimizedResult) return;

    await updateSchedule.mutateAsync({
      id: schedule.id,
      updates: {
        route: optimizedResult.optimized_route,
        optimization_method: 'ai_optimized'
      }
    });

    setOptimizedResult(null);
    onOpenChange(false);
  };

  const handleReject = () => {
    setOptimizedResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setOptimizedResult(null);
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Optimize Delivery Route</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!optimizedResult ? (
            <>
              <Alert>
                <Route className="h-4 w-4" />
                <AlertDescription>
                  AI will optimize the route sequence to minimize travel time and distance.
                  This may take a few seconds.
                </AlertDescription>
              </Alert>

              {schedule && (
                <div className="text-sm space-y-2">
                  <p><strong>Schedule:</strong> {schedule.title}</p>
                  <p><strong>Facilities:</strong> {schedule.facility_ids.length} stops</p>
                  <p><strong>Current Method:</strong> {schedule.optimization_method || 'manual'}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <Alert variant="success" className="bg-success/10 border-success/20">
                <Route className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Route optimized successfully!
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <span>Total Distance</span>
                  </div>
                  <span className="font-semibold">{optimizedResult.total_distance.toFixed(1)} km</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Estimated Duration</span>
                  </div>
                  <span className="font-semibold">{Math.round(optimizedResult.estimated_duration / 60)} min</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Number of Stops</span>
                  </div>
                  <span className="font-semibold">{optimizedResult.stops?.length || schedule?.facility_ids.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!optimizedResult ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleOptimize}
                disabled={optimize.isPending || !schedule}
              >
                {optimize.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  'Start Optimization'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReject}>
                Reject
              </Button>
              <Button onClick={handleAccept} disabled={updateSchedule.isPending}>
                {updateSchedule.isPending ? 'Accepting...' : 'Accept & Apply'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

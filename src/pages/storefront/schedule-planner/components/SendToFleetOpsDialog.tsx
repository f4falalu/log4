import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DeliverySchedule, useUpdateSchedule } from '@/hooks/useDeliverySchedules';
import { useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import { AlertCircle, CheckCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SendToFleetOpsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: DeliverySchedule | null;
}

export function SendToFleetOpsDialog({
  open,
  onOpenChange,
  schedule
}: SendToFleetOpsDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const updateSchedule = useUpdateSchedule();
  const createBatch = useCreateDeliveryBatch();
  const navigate = useNavigate();

  const canSend = schedule && 
    schedule.status === 'confirmed' && 
    schedule.vehicle_id && 
    schedule.driver_id &&
    schedule.facility_ids.length > 0;

  const handleSend = async () => {
    if (!schedule || !canSend) return;

    setIsSending(true);
    try {
      // Create delivery batch
      await createBatch.mutateAsync({
        name: schedule.title,
        warehouseId: schedule.warehouse_id,
        warehouseName: schedule.warehouse?.name || '',
        driverId: schedule.driver_id!,
        vehicleId: schedule.vehicle_id!,
        scheduledDate: schedule.planned_date,
        scheduledTime: getTimeFromWindow(schedule.time_window),
        status: 'assigned',
        priority: 'medium',
        totalDistance: 0, // Will be calculated
        estimatedDuration: 0, // Will be calculated
        medicationType: 'general',
        totalQuantity: schedule.total_payload_kg,
        optimizedRoute: schedule.route || [],
        facilities: [], // Will be populated
        notes: schedule.notes
      });

      // Update schedule status
      await updateSchedule.mutateAsync({
        id: schedule.id,
        updates: {
          status: 'dispatched',
          dispatched_at: new Date().toISOString()
        }
      });

      onOpenChange(false);
      
      // Show success and offer navigation
      const goToFleetOps = window.confirm(
        'Schedule successfully sent to FleetOps! Would you like to view it in the FleetOps Tactical Map?'
      );
      
      if (goToFleetOps) {
        navigate('/fleetops');
      }
    } catch (error) {
      console.error('Failed to send to FleetOps:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getTimeFromWindow = (window: string): string => {
    switch (window) {
      case 'morning': return '08:00:00';
      case 'afternoon': return '14:00:00';
      case 'evening': return '18:00:00';
      default: return '09:00:00';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Schedule to FleetOps</DialogTitle>
          <DialogDescription>
            This will create a delivery batch and notify the assigned driver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!canSend ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot send to FleetOps. Please ensure:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {schedule?.status !== 'confirmed' && <li>Schedule is confirmed</li>}
                  {!schedule?.vehicle_id && <li>Vehicle is assigned</li>}
                  {!schedule?.driver_id && <li>Driver is assigned</li>}
                  {(schedule?.facility_ids.length || 0) === 0 && <li>At least one facility is added</li>}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Schedule is ready to be dispatched.
                </AlertDescription>
              </Alert>

              {schedule && (
                <div className="text-sm space-y-2 p-4 bg-secondary rounded-lg">
                  <p><strong>Schedule:</strong> {schedule.title}</p>
                  <p><strong>Date:</strong> {schedule.planned_date}</p>
                  <p><strong>Time:</strong> {schedule.time_window}</p>
                  <p><strong>Vehicle:</strong> {schedule.vehicle?.model} ({schedule.vehicle?.plate_number})</p>
                  <p><strong>Driver:</strong> {schedule.driver?.name}</p>
                  <p><strong>Facilities:</strong> {schedule.facility_ids.length} stops</p>
                  <p><strong>Payload:</strong> {schedule.total_payload_kg} kg</p>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. The schedule will be locked and moved to FleetOps.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={!canSend || isSending}
          >
            {isSending ? (
              <>
                <Send className="mr-2 h-4 w-4 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send to FleetOps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

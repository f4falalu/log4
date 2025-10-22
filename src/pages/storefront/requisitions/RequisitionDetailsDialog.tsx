import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Requisition } from '@/types/requisitions';

interface RequisitionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: Requisition;
}

export function RequisitionDetailsDialog({
  open,
  onOpenChange,
  requisition,
}: RequisitionDetailsDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'fulfilled': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'default';
      case 'urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisition Details</DialogTitle>
          <DialogDescription>
            {requisition.requisition_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={getStatusColor(requisition.status)} className="mt-1">
                {requisition.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge variant={getPriorityColor(requisition.priority)} className="mt-1">
                {requisition.priority}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Delivery Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Facility</p>
                <p className="font-medium">{requisition.facility?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{requisition.facility?.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warehouse</p>
                <p className="font-medium">{requisition.warehouse?.name || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Requested Delivery Date</p>
                <p className="font-medium">
                  {format(new Date(requisition.requested_delivery_date), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {requisition.items && requisition.items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Requisition Items</h3>
                <div className="space-y-3">
                  {requisition.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} {item.unit}
                          </p>
                          {(item.weight_kg || item.volume_m3) && (
                            <p className="text-sm text-muted-foreground">
                              {item.weight_kg && `Weight: ${item.weight_kg} kg`}
                              {item.weight_kg && item.volume_m3 && ' • '}
                              {item.volume_m3 && `Volume: ${item.volume_m3} m³`}
                            </p>
                          )}
                          {item.temperature_required && (
                            <Badge variant="outline" className="mt-1">
                              Temperature Controlled
                            </Badge>
                          )}
                          {item.handling_instructions && (
                            <p className="text-sm mt-2">
                              <span className="font-medium">Handling: </span>
                              {item.handling_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {requisition.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm">{requisition.notes}</p>
              </div>
            </>
          )}

          {requisition.status === 'rejected' && requisition.rejection_reason && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">Rejection Reason</h3>
                <p className="text-sm">{requisition.rejection_reason}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{format(new Date(requisition.created_at), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            {requisition.approved_at && (
              <div>
                <p className="text-muted-foreground">Approved</p>
                <p>{format(new Date(requisition.approved_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            )}
            {requisition.fulfilled_at && (
              <div>
                <p className="text-muted-foreground">Fulfilled</p>
                <p>{format(new Date(requisition.fulfilled_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

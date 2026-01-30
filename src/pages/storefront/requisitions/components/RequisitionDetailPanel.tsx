import { format } from 'date-fns';
import {
  X,
  Building2,
  Warehouse,
  Calendar,
  User,
  Check,
  XCircle,
  Package,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Requisition, RequisitionStatus } from '@/types/requisitions';
import { REQUISITION_STATUS_CONFIG, REQUISITION_PURPOSES } from '@/types/requisitions';
import { useUpdateRequisitionStatus } from '@/hooks/useRequisitions';

interface RequisitionDetailPanelProps {
  requisition: Requisition;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function RequisitionDetailPanel({
  requisition,
  onClose,
  onApprove,
  onReject,
}: RequisitionDetailPanelProps) {
  const updateStatus = useUpdateRequisitionStatus();
  const statusConfig = REQUISITION_STATUS_CONFIG[requisition.status];
  const purposeConfig = REQUISITION_PURPOSES.find(p => p.value === requisition.purpose);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = () => {
    updateStatus.mutate({ id: requisition.id, status: 'approved' });
  };

  const handleMarkReady = () => {
    updateStatus.mutate({ id: requisition.id, status: 'ready_for_dispatch' });
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold font-mono">
              {requisition.sriv_number || requisition.requisition_number}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn('font-normal', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <Badge className={cn('font-normal', getPriorityColor(requisition.priority))}>
                {requisition.priority}
              </Badge>
              {requisition.purpose && requisition.purpose !== 'requisition' && (
                <Badge variant="outline">{purposeConfig?.label}</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Facility Info */}
          {requisition.facility && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Facility</h3>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{requisition.facility.name}</span>
                </div>
                {requisition.facility.address && (
                  <p className="text-sm text-muted-foreground ml-6">{requisition.facility.address}</p>
                )}
                {(requisition.facility.lga || requisition.facility.zone) && (
                  <p className="text-sm text-muted-foreground ml-6">
                    {[requisition.facility.lga, requisition.facility.zone].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warehouse Info */}
          {requisition.warehouse && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Warehouse</h3>
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span>{requisition.warehouse.name}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Dates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Requested Delivery</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{formatDate(requisition.requested_delivery_date)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created</p>
                <span className="text-sm">{formatDate(requisition.created_at)}</span>
              </div>
              {requisition.submission_date && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <span className="text-sm">{formatDate(requisition.submission_date)}</span>
                </div>
              )}
              {requisition.approved_at && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <span className="text-sm">{formatDate(requisition.approved_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Program & Purpose */}
          {(requisition.program || requisition.purpose) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Details</h3>
                {requisition.program && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Program</p>
                    <Badge variant="outline">{requisition.program}</Badge>
                  </div>
                )}
                {requisition.received_from && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Received From</p>
                    <p className="text-sm">{requisition.received_from}</p>
                  </div>
                )}
                {requisition.issued_to && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Issued To</p>
                    <p className="text-sm">{requisition.issued_to}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Incharges */}
          {(requisition.pharmacy_incharge || requisition.facility_incharge) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Approvals</h3>
                {requisition.pharmacy_incharge && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{requisition.pharmacy_incharge}</span>
                    <span className="text-xs text-muted-foreground">(Pharmacy)</span>
                  </div>
                )}
                {requisition.facility_incharge && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{requisition.facility_incharge}</span>
                    <span className="text-xs text-muted-foreground">(Facility)</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Line Items */}
          {requisition.items && requisition.items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Line Items ({requisition.items.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Item</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requisition.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs">{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {requisition.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                <p className="text-sm">{requisition.notes}</p>
              </div>
            </>
          )}

          {/* Rejection reason */}
          {requisition.rejection_reason && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-red-600">Rejection Reason</h3>
                <p className="text-sm text-red-600">{requisition.rejection_reason}</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t space-y-2">
        {requisition.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              className="flex-1"
              disabled={updateStatus.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              className="flex-1"
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {requisition.status === 'approved' && (
          <Button
            onClick={handleMarkReady}
            className="w-full"
            disabled={updateStatus.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Mark Ready for Dispatch
          </Button>
        )}

        {requisition.status === 'ready_for_dispatch' && (
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>
    </div>
  );
}

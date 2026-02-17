import { format } from 'date-fns';
import { X, Building2, Warehouse, Calendar, FileText, Truck, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceStatus } from '@/types/invoice';
import { INVOICE_STATUS_CONFIG } from '@/types/invoice';
import { useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { useNavigate } from 'react-router-dom';

interface InvoiceDetailPanelProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceDetailPanel({ invoice, onClose }: InvoiceDetailPanelProps) {
  const navigate = useNavigate();
  const updateStatus = useUpdateInvoiceStatus();
  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const canDispatch = () => {
    return (
      invoice.status === 'ready' ||
      invoice.status === 'packaged'
    ) && invoice.total_weight_kg && invoice.total_volume_m3;
  };

  const handleDispatchToFleetOps = () => {
    // Navigate to Storefront scheduler with invoice data
    navigate('/storefront/scheduler', {
      state: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        facilityId: invoice.facility_id,
        warehouseId: invoice.warehouse_id,
      },
    });
  };

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    updateStatus.mutate({ id: invoice.id, status: newStatus });
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold font-mono">{invoice.invoice_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('font-normal', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              {invoice.ref_number && (
                <Badge variant="outline">Ref: {invoice.ref_number}</Badge>
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
          {invoice.facility && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Destination</h3>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{invoice.facility.name}</span>
                </div>
                {invoice.facility.address && (
                  <p className="text-sm text-muted-foreground ml-6">{invoice.facility.address}</p>
                )}
                {invoice.facility.lga && (
                  <p className="text-sm text-muted-foreground ml-6">{invoice.facility.lga}</p>
                )}
              </div>
            </div>
          )}

          {/* Warehouse Info */}
          {invoice.warehouse && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Source Warehouse</h3>
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span>{invoice.warehouse.name}</span>
                {invoice.warehouse.code && (
                  <Badge variant="outline" className="text-xs">{invoice.warehouse.code}</Badge>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Dates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{formatDate(invoice.created_at)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <span className="text-sm">{formatDate(invoice.updated_at)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metrics */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Weight</p>
                <p className="text-lg font-semibold">
                  {invoice.total_weight_kg?.toFixed(2) || '-'} kg
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-lg font-semibold">
                  {invoice.total_volume_m3?.toFixed(4) || '-'} m³
                </p>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(invoice.total_price)}
              </p>
            </div>
          </div>

          {invoice.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            </>
          )}

          {/* Status Actions */}
          {invoice.status === 'draft' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStatusChange('ready')}
                    disabled={updateStatus.isPending}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </Button>
                </div>
              </div>
            </>
          )}

          {invoice.packaging_required && invoice.status === 'ready' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Packaging</h3>
                <p className="text-sm text-muted-foreground">
                  This invoice requires packaging before dispatch.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleStatusChange('packaging_pending')}
                  disabled={updateStatus.isPending}
                >
                  Start Packaging
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t space-y-2">
        {canDispatch() && (
          <Button onClick={handleDispatchToFleetOps} className="w-full">
            <Truck className="h-4 w-4 mr-2" />
            Dispatch to FleetOps
          </Button>
        )}
        <Button variant="outline" className="w-full">
          <Edit className="h-4 w-4 mr-2" />
          Edit Invoice
        </Button>
      </div>
    </div>
  );
}

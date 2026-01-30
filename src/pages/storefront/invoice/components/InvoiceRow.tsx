import { format } from 'date-fns';
import { Building2, Warehouse, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/invoice';
import { INVOICE_STATUS_CONFIG } from '@/types/invoice';

interface InvoiceRowProps {
  invoice: Invoice;
  onClick: () => void;
  isSelected: boolean;
}

export function InvoiceRow({ invoice, onClick, isSelected }: InvoiceRowProps) {
  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div
      className={cn(
        'p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-blue-50 border-blue-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{invoice.invoice_number}</span>
            {invoice.ref_number && (
              <Badge variant="outline" className="text-xs">
                Ref: {invoice.ref_number}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {invoice.facility && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{invoice.facility.name}</span>
              </div>
            )}

            {invoice.warehouse && (
              <div className="flex items-center gap-1">
                <Warehouse className="h-3.5 w-3.5" />
                <span>{invoice.warehouse.name}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(invoice.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <Badge className={cn('font-normal', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          <p className="text-lg font-semibold">{formatCurrency(invoice.total_price)}</p>
        </div>
      </div>

      {(invoice.total_weight_kg || invoice.total_volume_m3) && (
        <div className="mt-2 pt-2 border-t flex items-center gap-4 text-xs text-muted-foreground">
          {invoice.total_weight_kg && (
            <span>Weight: {invoice.total_weight_kg.toFixed(2)} kg</span>
          )}
          {invoice.total_volume_m3 && (
            <span>Volume: {invoice.total_volume_m3.toFixed(4)} m³</span>
          )}
          {invoice.packaging_required && (
            <Badge variant="outline" className="text-xs">Packaging Required</Badge>
          )}
        </div>
      )}
    </div>
  );
}

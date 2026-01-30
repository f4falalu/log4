import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  CheckCircle,
  Package,
  Truck,
  Check,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Requisition, RequisitionStatus } from '@/types/requisitions';
import { REQUISITION_STATUS_CONFIG } from '@/types/requisitions';

const STATUS_ORDER: RequisitionStatus[] = [
  'pending',
  'approved',
  'packaged',
  'ready_for_dispatch',
  'assigned_to_batch',
  'in_transit',
  'fulfilled',
  'partially_delivered',
  'rejected',
  'cancelled',
];

const STATUS_ICONS: Record<RequisitionStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  approved: CheckCircle,
  packaged: Package,
  ready_for_dispatch: Truck,
  assigned_to_batch: Truck,
  in_transit: Truck,
  fulfilled: Check,
  partially_delivered: AlertTriangle,
  failed: XCircle,
  rejected: XCircle,
  cancelled: XCircle,
};

interface RequisitionsListViewProps {
  requisitions: Requisition[];
  isLoading: boolean;
  onRequisitionClick: (requisition: Requisition) => void;
  selectedRequisitionId?: string;
  openAccordions: string[];
  onAccordionsChange: (values: string[]) => void;
}

export function RequisitionsListView({
  requisitions,
  isLoading,
  onRequisitionClick,
  selectedRequisitionId,
  openAccordions,
  onAccordionsChange,
}: RequisitionsListViewProps) {
  // Group requisitions by status
  const groupedRequisitions = useMemo(() => {
    const groups: Record<RequisitionStatus, Requisition[]> = {} as any;
    STATUS_ORDER.forEach(status => {
      groups[status] = [];
    });

    requisitions.forEach((req) => {
      if (groups[req.status]) {
        groups[req.status].push(req);
      }
    });

    return groups;
  }, [requisitions]);

  const formatDate = (dateString: string) => {
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

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (requisitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 mb-2 opacity-50" />
        <p>No requisitions found</p>
        <p className="text-sm">Create a new requisition to get started</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <Accordion
        type="multiple"
        value={openAccordions}
        onValueChange={onAccordionsChange}
      >
        {STATUS_ORDER.map((status) => {
          const statusRequisitions = groupedRequisitions[status];
          const config = REQUISITION_STATUS_CONFIG[status];
          const Icon = STATUS_ICONS[status];

          if (statusRequisitions.length === 0) return null;

          return (
            <AccordionItem key={status} value={status} className="border rounded-lg mb-2">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full', config.color.split(' ')[0])} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{config.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {statusRequisitions.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {statusRequisitions.map((req) => (
                    <div
                      key={req.id}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedRequisitionId === req.id && 'bg-blue-50 border-blue-200'
                      )}
                      onClick={() => onRequisitionClick(req)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">
                              {req.sriv_number || req.requisition_number}
                            </span>
                            <Badge className={cn('font-normal', getPriorityColor(req.priority))}>
                              {req.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {req.facility && (
                              <span>{req.facility.name}</span>
                            )}
                            {req.warehouse && (
                              <span className="text-xs">→ {req.warehouse.name}</span>
                            )}
                          </div>
                          {req.program && (
                            <Badge variant="outline" className="text-xs">
                              {req.program}
                            </Badge>
                          )}
                        </div>

                        <div className="text-right space-y-1">
                          <p className="text-sm">
                            {formatDate(req.requested_delivery_date)}
                          </p>
                          {req.items && req.items.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {req.items.length} item{req.items.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

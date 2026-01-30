import { FileText, Package, Clock, CheckCircle } from 'lucide-react';
import type { Requisition } from '@/types/requisitions';

interface RequisitionSummaryStripProps {
  requisitions: Requisition[];
}

export function RequisitionSummaryStrip({ requisitions }: RequisitionSummaryStripProps) {
  const totalRequisitions = requisitions.length;
  const pendingCount = requisitions.filter(r => r.status === 'pending').length;
  const approvedCount = requisitions.filter(r => r.status === 'approved').length;
  const totalItems = requisitions.reduce((sum, r) => sum + (r.items?.length || 0), 0);

  return (
    <div className="h-12 border-t bg-muted/30 px-4 flex items-center gap-6">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{totalRequisitions}</span>
        <span className="text-muted-foreground">requisitions</span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{totalItems}</span>
        <span className="text-muted-foreground">total items</span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-yellow-500" />
        <span className="font-medium">{pendingCount}</span>
        <span className="text-muted-foreground">pending</span>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-blue-500" />
        <span className="font-medium">{approvedCount}</span>
        <span className="text-muted-foreground">approved</span>
      </div>
    </div>
  );
}

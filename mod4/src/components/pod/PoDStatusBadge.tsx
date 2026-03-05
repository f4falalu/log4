// MOD4 PoD Status Badge Component

import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { PoDStatus } from '@/lib/db/schema';

interface PoDStatusBadgeProps {
  status: PoDStatus;
  hasDiscrepancy?: boolean;
  isProxyDelivery?: boolean;
  size?: 'sm' | 'md';
}

export function PoDStatusBadge({ 
  status, 
  hasDiscrepancy, 
  isProxyDelivery,
  size = 'md' 
}: PoDStatusBadgeProps) {
  const isFlagged = status === 'flagged';
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider",
      sizeClasses[size],
      isFlagged 
        ? "bg-warning/20 text-warning" 
        : "bg-success/20 text-success"
    )}>
      {isFlagged ? (
        <AlertTriangle className={cn("flex-shrink-0", size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5")} />
      ) : (
        <CheckCircle2 className={cn("flex-shrink-0", size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5")} />
      )}
      {isFlagged ? (
        hasDiscrepancy && isProxyDelivery 
          ? 'Flagged' 
          : hasDiscrepancy 
            ? 'Discrepancy' 
            : 'Proxy'
      ) : 'Complete'}
    </span>
  );
}
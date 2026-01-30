/**
 * =====================================================
 * Status Tabs Component
 * =====================================================
 * Vertical status tabs for filtering batches by status
 */

import {
  FileEdit,
  CheckCircle,
  Calendar,
  Send,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SchedulerBatchStatus } from '@/types/scheduler';

interface StatusTabsProps {
  activeStatus: SchedulerBatchStatus;
  onStatusChange: (status: SchedulerBatchStatus) => void;
  counts?: Record<SchedulerBatchStatus, number>;
}

const STATUS_CONFIG: Record<
  SchedulerBatchStatus,
  {
    label: string;
    icon: any;
    color: string;
    bgColor: string;
  }
> = {
  draft: {
    label: 'Draft',
    icon: FileEdit,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted hover:bg-muted/80',
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle,
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-info',
    bgColor: 'bg-info/10 hover:bg-info/20',
  },
  published: {
    label: 'Published',
    icon: Send,
    color: 'text-success',
    bgColor: 'bg-success/10 hover:bg-success/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 hover:bg-destructive/20',
  },
};

export function StatusTabs({
  activeStatus,
  onStatusChange,
  counts,
}: StatusTabsProps) {
  return (
    <div className="flex w-48 flex-col gap-1 border-r bg-white p-4 min-h-0">
      <h3 className="mb-2 px-3 text-sm font-semibold text-gray-700">
        Status
      </h3>
      {(Object.keys(STATUS_CONFIG) as SchedulerBatchStatus[]).map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const isActive = activeStatus === status;
        const count = counts?.[status] || 0;

        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? `${config.bgColor} ${config.color}`
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{config.label}</span>
            {count > 0 && (
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className="h-5 min-w-[20px] px-1.5 text-xs"
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

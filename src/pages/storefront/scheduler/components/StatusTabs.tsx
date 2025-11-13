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
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 hover:bg-gray-200',
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  published: {
    label: 'Published',
    icon: Send,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
};

export function StatusTabs({
  activeStatus,
  onStatusChange,
  counts,
}: StatusTabsProps) {
  return (
    <div className="flex w-48 flex-col gap-1 border-r bg-white p-4">
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

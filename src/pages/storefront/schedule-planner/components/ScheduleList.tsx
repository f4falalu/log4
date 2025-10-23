import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduleCard } from './ScheduleCard';
import { DeliverySchedule } from '@/hooks/useDeliverySchedules';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduleListProps {
  schedules: DeliverySchedule[];
  onViewRoute: (schedule: DeliverySchedule) => void;
  onOptimize: (schedule: DeliverySchedule) => void;
  onExport: (schedule: DeliverySchedule) => void;
  onSendToFleetOps: (schedule: DeliverySchedule) => void;
  isLoading?: boolean;
}

export function ScheduleList({
  schedules,
  onViewRoute,
  onOptimize,
  onExport,
  onSendToFleetOps,
  isLoading
}: ScheduleListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No schedules found. Create a new schedule to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onViewRoute={onViewRoute}
            onOptimize={onOptimize}
            onExport={onExport}
            onSendToFleetOps={onSendToFleetOps}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * =====================================================
 * Route Insights Panel
 * =====================================================
 * Displays route statistics and insights.
 */

import * as React from 'react';
import { Package, Clock, Target, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteInsightsPanelProps {
  totalPayloadKg?: number;
  estimatedHours?: number;
  facilityCount?: number;
  totalSlots?: number;
  className?: string;
}

export function RouteInsightsPanel({
  totalPayloadKg = 0,
  estimatedHours = 0,
  facilityCount = 0,
  totalSlots = 0,
  className,
}: RouteInsightsPanelProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 gap-3">
        <InsightItem
          icon={<Package className="h-4 w-4" />}
          label="Total Payload"
          value={totalPayloadKg > 0 ? `${totalPayloadKg.toLocaleString()} kg` : '-'}
        />
        <InsightItem
          icon={<Clock className="h-4 w-4" />}
          label="Est. Turnaround"
          value={estimatedHours > 0 ? `${estimatedHours} hrs` : '-'}
        />
        <InsightItem
          icon={<Target className="h-4 w-4" />}
          label="Facility Count"
          value={`${facilityCount} stops`}
        />
        <InsightItem
          icon={<Route className="h-4 w-4" />}
          label="Total Slots"
          value={`${totalSlots} slots`}
        />
      </div>
    </div>
  );
}

interface InsightItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InsightItem({ icon, label, value }: InsightItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

export default RouteInsightsPanel;

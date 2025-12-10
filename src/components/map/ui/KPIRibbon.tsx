import { Truck, Package, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { FLOATING_PANEL, Z_INDEX, CONTAINER } from '@/lib/mapDesignSystem';
import { getStatusColors } from '@/lib/designTokens';
import { cn } from '@/lib/utils';

interface KPIRibbonProps {
  activeVehicles?: number;
  inProgress?: number;
  completed?: number;
  alerts?: number;
  onTimePercentage?: number;
}

export function KPIRibbon({
  activeVehicles = 0,
  inProgress = 0,
  completed = 0,
  alerts = 0,
  onTimePercentage = 100,
}: KPIRibbonProps) {
  const inProgressColors = getStatusColors('in_progress');
  const completedColors = getStatusColors('completed');
  const warningColors = getStatusColors('warning');

  return (
    <div
      className={cn(
        'absolute top-4 left-1/2 -translate-x-1/2',
        FLOATING_PANEL.kpi,
        'px-6 py-3'
      )}
      style={{ zIndex: Z_INDEX.mapControls }}
    >
      <div className={cn(CONTAINER.kpi, 'flex items-center gap-6')}>
        {/* Active Vehicles */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-lg font-semibold">{activeVehicles}</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* In Progress */}
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-full", inProgressColors.bg)}>
            <Package className={cn("h-5 w-5", inProgressColors.text)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">In Progress</div>
            <div className="text-lg font-semibold">{inProgress}</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* Completed */}
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-full", completedColors.bg)}>
            <CheckCircle className={cn("h-5 w-5", completedColors.text)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold">{completed}</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        {/* On-Time Performance */}
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-full", completedColors.bg)}>
            <TrendingUp className={cn("h-5 w-5", completedColors.text)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">On-Time</div>
            <div className={cn("text-lg font-semibold", completedColors.text)}>{onTimePercentage}%</div>
          </div>
        </div>

        {alerts > 0 && (
          <>
            <div className="h-10 w-px bg-border" />

            {/* Alerts */}
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center w-10 h-10 rounded-full", warningColors.bg)}>
                <AlertTriangle className={cn("h-5 w-5", warningColors.text)} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Alerts</div>
                <div className={cn("text-lg font-semibold", warningColors.text)}>{alerts}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

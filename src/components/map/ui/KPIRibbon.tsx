import { Truck, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIRibbonProps {
  activeVehicles?: number;
  inProgress?: number;
  completed?: number;
  alerts?: number;
  onTimePercentage?: number;
  isLoading?: boolean;
  className?: string;
}

export function KPIRibbon({
  activeVehicles = 0,
  inProgress = 0,
  completed = 0,
  alerts = 0,
  onTimePercentage = 100,
  isLoading = false,
  className,
}: KPIRibbonProps) {
  return (
    <div
      className={cn(
        'bg-background border border-border shadow-sm rounded-lg px-4 py-2.5 flex items-center gap-4',
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div>
                <Skeleton className="h-3 w-10 mb-1" />
                <Skeleton className="h-5 w-6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Active Vehicles */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</div>
              <div className="text-base font-semibold leading-none">{activeVehicles}</div>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* In Progress */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">In Progress</div>
              <div className="text-base font-semibold leading-none">{inProgress}</div>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Completed */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</div>
              <div className="text-base font-semibold leading-none">{completed}</div>
            </div>
          </div>

          {alerts > 0 && (
            <>
              <div className="h-8 w-px bg-border" />

              {/* Alerts */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Alerts</div>
                  <div className="text-base font-semibold leading-none text-destructive">{alerts}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Readiness Status Component
 *
 * Displays the current workspace readiness status in a compact format.
 * Can be used in sidebars, headers, or dashboards.
 */

import { useWorkspaceReadiness } from '@/hooks/useWorkspaceReadiness';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getReadinessGateLabel } from '@/types/onboarding';

interface ReadinessStatusProps {
  workspaceId: string | null | undefined;
  variant?: 'badge' | 'progress' | 'detailed';
  showLabel?: boolean;
}

export function ReadinessStatus({
  workspaceId,
  variant = 'badge',
  showLabel = true,
}: ReadinessStatusProps) {
  const { data: readiness, isLoading } = useWorkspaceReadiness(workspaceId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {showLabel && <span className="text-sm text-muted-foreground">Checking...</span>}
      </div>
    );
  }

  if (!readiness) {
    return null;
  }

  // Badge variant - simple status indicator
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={readiness.is_ready ? 'default' : 'secondary'}
              className={`gap-1 ${readiness.is_ready ? 'bg-success hover:bg-success/90' : ''}`}
            >
              {readiness.is_ready ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {showLabel && (readiness.is_ready ? 'Ready' : 'Setup Required')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {readiness.is_ready ? (
              <p>Workspace is fully configured</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">Missing setup:</p>
                <ul className="text-xs">
                  {readiness.missing_items?.map((item) => (
                    <li key={item}>• {getReadinessGateLabel(item)}</li>
                  ))}
                </ul>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Progress variant - progress bar with percentage
  if (variant === 'progress') {
    return (
      <div className="space-y-1">
        {showLabel && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Setup</span>
            <span className="font-medium">{readiness.progress_percentage}%</span>
          </div>
        )}
        <Progress value={readiness.progress_percentage} className="h-1.5" />
      </div>
    );
  }

  // Detailed variant - full checklist
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Setup Status</span>
        <Badge
          variant={readiness.is_ready ? 'default' : 'secondary'}
          className={readiness.is_ready ? 'bg-success hover:bg-success/90' : ''}
        >
          {readiness.progress_percentage}%
        </Badge>
      </div>
      <Progress value={readiness.progress_percentage} className="h-2" />
      <div className="grid grid-cols-2 gap-1 text-xs">
        <StatusItem label="Admin" completed={readiness.has_admin} />
        <StatusItem label="RBAC" completed={readiness.has_rbac_configured} />
        <StatusItem label="Warehouse" completed={readiness.has_warehouse} />
        <StatusItem label="Vehicle" completed={readiness.has_vehicle} />
        <StatusItem label="Packaging" completed={readiness.has_packaging_rules} />
      </div>
    </div>
  );
}

function StatusItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {completed ? (
        <CheckCircle2 className="h-3 w-3 text-success" />
      ) : (
        <AlertCircle className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={completed ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

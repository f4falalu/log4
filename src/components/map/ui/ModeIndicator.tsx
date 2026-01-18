import { ControlSurface } from './ControlSurface';
import { Activity, PenTool, History } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Map mode types
 */
export type MapMode = 'operational' | 'planning' | 'forensic';

/**
 * Mode Indicator Props
 */
interface ModeIndicatorProps {
  /** Current map mode */
  mode: MapMode;

  /** Custom className */
  className?: string;
}

/**
 * Mode configuration with visual identity
 */
const MODE_CONFIG: Record<MapMode, {
  label: string;
  icon: typeof Activity;
  color: string;
  bgColor: string;
  description: string;
}> = {
  operational: {
    label: 'Live Operations',
    icon: Activity,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Real-time dispatch and exception handling',
  },
  planning: {
    label: 'Planning Mode',
    icon: PenTool,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Draft zones, routes, and configurations',
  },
  forensic: {
    label: 'Forensic Analysis',
    icon: History,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Historical replay and performance analysis',
  },
};

/**
 * Mode Indicator Component
 *
 * Visual indicator for current map mode with semantic color coding.
 * Ensures user always knows what context they're operating in.
 *
 * Industry Standard:
 * - Modes are mental contexts, not just toggles
 * - UI must reframe completely between modes
 * - User should never be confused about current capabilities
 *
 * Usage:
 * ```tsx
 * <ModeIndicator mode="operational" />
 * ```
 */
export function ModeIndicator({ mode, className }: ModeIndicatorProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <ControlSurface
      variant="kpi"
      position="top-center"
      className={cn('flex-row items-center gap-3 min-w-[280px]', className)}
    >
      <div className={cn('p-2 rounded-lg', config.bgColor)}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="text-xs text-muted-foreground">{config.description}</span>
      </div>
    </ControlSurface>
  );
}

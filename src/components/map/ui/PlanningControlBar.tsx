/**
 * PlanningControlBar
 *
 * Horizontal control bar for the Planning map page.
 * Contains metric toggle, scenario simulation button, analytics button, and theme toggle.
 */

import { useState } from 'react';
import { Moon, Sun, BarChart3, Beaker, TrendingUp, Archive, Activity } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type PlanningMetric = 'demand' | 'capacity' | 'sla';

interface PlanningControlBarProps {
  selectedMetric: PlanningMetric;
  onMetricChange: (metric: PlanningMetric) => void;
  onOpenScenario?: () => void;
  onOpenAnalytics?: () => void;
  className?: string;
}

const metricConfig = {
  demand: {
    label: 'Demand',
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  capacity: {
    label: 'Capacity',
    icon: Archive,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  sla: {
    label: 'SLA Risk',
    icon: Activity,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
};

export function PlanningControlBar({
  selectedMetric,
  onMetricChange,
  onOpenScenario,
  onOpenAnalytics,
  className,
}: PlanningControlBarProps) {
  const { setTheme, theme } = useTheme();
  const [metricOpen, setMetricOpen] = useState(false);

  const currentMetric = metricConfig[selectedMetric];
  const MetricIcon = currentMetric.icon;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div
      className={cn(
        'bg-background border border-border shadow-sm rounded-lg px-2 py-1.5 flex items-center gap-1',
        className
      )}
    >
      {/* Metric Toggle */}
      <Popover open={metricOpen} onOpenChange={setMetricOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-3 gap-2',
              metricOpen && 'bg-accent'
            )}
          >
            <div className={cn('p-1 rounded', currentMetric.bgColor)}>
              <MetricIcon className={cn('h-3.5 w-3.5', currentMetric.color)} />
            </div>
            <span className="text-sm font-medium">{currentMetric.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <div className="space-y-0.5">
            {(Object.keys(metricConfig) as PlanningMetric[]).map((metric) => {
              const config = metricConfig[metric];
              const Icon = config.icon;
              return (
                <Button
                  key={metric}
                  variant={selectedMetric === metric ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start h-9"
                  onClick={() => {
                    onMetricChange(metric);
                    setMetricOpen(false);
                  }}
                >
                  <div className={cn('p-1 rounded mr-2', config.bgColor)}>
                    <Icon className={cn('h-3.5 w-3.5', config.color)} />
                  </div>
                  {config.label}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border" />

      {/* Scenario Simulation Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 gap-2"
        onClick={onOpenScenario}
      >
        <div className="p-1 rounded bg-purple-500/10">
          <Beaker className="h-3.5 w-3.5 text-purple-500" />
        </div>
        <span className="text-sm font-medium">Scenarios</span>
      </Button>

      <div className="h-6 w-px bg-border" />

      {/* Analytics Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 gap-2"
        onClick={onOpenAnalytics}
      >
        <div className="p-1 rounded bg-cyan-500/10">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />
        </div>
        <span className="text-sm font-medium">Analytics</span>
      </Button>

      <div className="h-6 w-px bg-border" />

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}

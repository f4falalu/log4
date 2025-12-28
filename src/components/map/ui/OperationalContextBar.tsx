import { Button } from '@/components/ui/button';
import { useMapContext } from '@/hooks/useMapContext';
import {
  BarChart3,
  Zap,
  Plus,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { HEIGHT } from '@/lib/mapDesignSystem';

interface OperationalContextBarProps {
  onAnalyticsClick: () => void;
  onOptimizeClick: () => void;
  onCreateBatchClick: () => void;
}

export function OperationalContextBar({
  onAnalyticsClick,
  onOptimizeClick,
  onCreateBatchClick,
}: OperationalContextBarProps) {
  const { mode, setMode } = useMapContext();

  const modes: Array<{ value: typeof mode; label: string }> = [
    { value: 'live', label: 'Live' },
    { value: 'planning', label: 'Planning' },
    { value: 'playback', label: 'Playback' },
    { value: 'config', label: 'Config' },
  ];

  return (
    <div className={cn(HEIGHT.topbar, 'bg-background border-b border-border flex items-center justify-between px-6')}>
      {/* Left: Mode Selector */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {modes.map((m) => (
          <Button
            key={m.value}
            variant={mode === m.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode(m.value)}
            className={cn(
              'h-8 px-3 transition-all',
              mode === m.value && 'shadow-sm'
            )}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onAnalyticsClick} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>

        <Button size="sm" onClick={onOptimizeClick} className="gap-2">
          <Zap className="h-4 w-4" />
          Optimize Routes
        </Button>

        <Button size="sm" variant="outline" onClick={onCreateBatchClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Batch
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Share Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

import { useMapContext } from '@/hooks/useMapContext';
import { AnalyticsPanel } from './AnalyticsPanel';
import { MapToolsPanel } from './MapToolsPanel';
import { TimelineScrubber } from './TimelineScrubber';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function MissionControlPanel() {
  const { panelMode, setPanelMode, isPanelExpanded, togglePanelExpanded } = useMapContext();
  const [playbackMode, setPlaybackMode] = useState<'live' | 'playback'>('live');
  const [playbackTime, setPlaybackTime] = useState(new Date());

  const shiftStart = new Date();
  shiftStart.setHours(8, 0, 0, 0);
  const shiftEnd = new Date();
  shiftEnd.setHours(17, 0, 0, 0);

  return (
    <div className="border-t border-border bg-background flex flex-col">
      {/* Header with Mode Toggle */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1.5">
          <Button
            variant={panelMode === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPanelMode('analytics')}
            className={cn(
              'h-9 px-4 transition-all',
              panelMode === 'analytics' && 'shadow-sm'
            )}
          >
            Analytics & Insights
          </Button>
          <Button
            variant={panelMode === 'tools' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPanelMode('tools')}
            className={cn(
              'h-9 px-4 transition-all',
              panelMode === 'tools' && 'shadow-sm'
            )}
          >
            Map Tools & Config
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={togglePanelExpanded}
          className="gap-2"
        >
          {isPanelExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Collapse
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Expand
            </>
          )}
        </Button>
      </div>

      {/* Dynamic Content Area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isPanelExpanded ? 'h-[480px]' : 'h-[280px]'
        )}
      >
        {panelMode === 'analytics' ? <AnalyticsPanel /> : <MapToolsPanel />}
      </div>

      {/* Timeline Scrubber (Always Visible) */}
      <div className="border-t border-border px-6 py-4">
        <TimelineScrubber
          mode={playbackMode}
          currentTime={playbackTime}
          shiftStart={shiftStart}
          shiftEnd={shiftEnd}
          onTimeChange={setPlaybackTime}
          onModeToggle={() =>
            setPlaybackMode((prev) => (prev === 'live' ? 'playback' : 'live'))
          }
        />
      </div>
    </div>
  );
}

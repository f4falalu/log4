/**
 * LeftPanel Component
 *
 * Tabbed sidebar with analytics:
 * - Route Intelligence tab
 * - Event Analytics tab
 *
 * Tab switching does NOT reset playback - state persists
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RouteIntelligenceTab } from './RouteIntelligenceTab';
import { EventAnalyticsTab } from './EventAnalyticsTab';
import { usePlaybackStore } from '@/stores/playbackStore';
import { BarChart3, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeftPanelProps {
  className?: string;
}

export function LeftPanel({ className }: LeftPanelProps) {
  const viewMode = usePlaybackStore((state) => state.viewMode);
  const setViewMode = usePlaybackStore((state) => state.setViewMode);
  const tripData = usePlaybackStore((state) => state.tripData);
  const [isCollapsed, setIsCollapsed] = useState(false); // Always expanded by default

  return (
    <div
      className={`border-r bg-background flex flex-col relative transition-all duration-300 shrink-0 ${
        isCollapsed ? 'w-12' : 'w-[360px]'
      } ${className || ''}`}
    >
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Collapsed state */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-4 pt-16 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded state */}
      {!isCollapsed && (
        <div className="flex flex-col h-full">
          {/* Analytics Tabs */}
          <Tabs
            value={viewMode}
            onValueChange={(value) =>
              setViewMode(value as 'route-intelligence' | 'event-analytics')
            }
            className="flex flex-col h-full"
          >
            {/* Tab headers */}
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-12">
              <TabsTrigger
                value="event-analytics"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <Activity className="h-4 w-4 mr-2" />
                Event Analytics
              </TabsTrigger>
              <TabsTrigger
                value="route-intelligence"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Map Intelligence
              </TabsTrigger>
            </TabsList>

            {/* Tab content */}
            <TabsContent
              value="event-analytics"
              className="flex-1 overflow-y-auto mt-0 p-0"
            >
              <EventAnalyticsTab />
            </TabsContent>

            <TabsContent
              value="route-intelligence"
              className="flex-1 overflow-y-auto mt-0 p-0"
            >
              <RouteIntelligenceTab />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

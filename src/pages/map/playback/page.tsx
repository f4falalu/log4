/**
 * Playback Map Page - Historical replay with analytics
 */

import { useState, useCallback, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { PlaybackMapView } from '../components/PlaybackMapView';
import { TimelineControls } from '../components/TimelineControls';
import { PlaybackAnalytics } from '../components/PlaybackAnalytics';
import { usePlaybackData, usePlaybackBatches } from '@/hooks/usePlaybackData';
import { useLiveMapStore } from '@/stores/liveMapStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PlaybackMapPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const playback = useLiveMapStore((s) => s.playback);
  const setPlaybackTimeRange = useLiveMapStore((s) => s.setPlaybackTimeRange);
  const setPlaybackActive = useLiveMapStore((s) => s.setPlaybackActive);

  // Fetch available batches for selection
  const { data: batches, isLoading: batchesLoading } = usePlaybackBatches();

  // Fetch playback data for selected batch
  const {
    events,
    analytics,
    stopAnalytics,
    timeRange,
    getPositionAtTime,
    getEventAtTime,
    isLoading: dataLoading,
  } = usePlaybackData({
    batchId: selectedBatchId || undefined,
    enabled: !!selectedBatchId,
  });

  // Set time range when data loads
  useMemo(() => {
    if (timeRange && selectedBatchId) {
      setPlaybackTimeRange(timeRange.start, timeRange.end);
      setPlaybackActive(true);
    }
  }, [timeRange, selectedBatchId, setPlaybackTimeRange, setPlaybackActive]);

  // Current position based on playback time
  const currentPosition = useMemo(() => {
    if (!playback.currentTime) return null;
    return getPositionAtTime(playback.currentTime);
  }, [playback.currentTime, getPositionAtTime]);

  // Current event/status based on playback time
  const currentEvent = useMemo(() => {
    if (!playback.currentTime) return null;
    return getEventAtTime(playback.currentTime);
  }, [playback.currentTime, getEventAtTime]);

  // Build facilities list from stop analytics
  const facilities = useMemo(() => {
    return stopAnalytics.map((stop) => ({
      id: stop.facilityId,
      name: stop.facilityName,
      position: [0, 0] as [number, number], // Would need actual positions
    }));
  }, [stopAnalytics]);

  // Handle batch selection
  const handleSelectBatch = useCallback(
    (batchId: string) => {
      setSelectedBatchId(batchId);
    },
    []
  );

  // Handle timeline time change
  const handleTimeChange = useCallback((time: Date) => {
    // Time changes are handled via the store
  }, []);

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // Get selected batch info
  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);

  return (
    <div className="flex flex-col h-full">
      {/* Header with batch selector */}
      <div className="border-b bg-background/95 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[250px] justify-between">
                {selectedBatch ? (
                  <span className="truncate">
                    {selectedBatch.name}
                    {selectedBatch.driverName && ` - ${selectedBatch.driverName}`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a batch...</span>
                )}
                <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              {batchesLoading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading batches...
                </div>
              ) : batches?.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No completed batches found
                </div>
              ) : (
                batches?.map((batch) => (
                  <DropdownMenuItem
                    key={batch.id}
                    onClick={() => handleSelectBatch(batch.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{batch.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {batch.driverName} • {formatDate(batch.startTime)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedBatch?.startTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(selectedBatch.startTime)}
              {selectedBatch.endTime && ` - ${formatDate(selectedBatch.endTime)}`}
            </div>
          )}
        </div>

        {dataLoading && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {selectedBatchId ? (
              <PlaybackMapView
                events={events}
                currentPosition={currentPosition}
                currentStatus={currentEvent?.driverStatus || null}
                facilities={facilities}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold">Playback Mode</h2>
                  <p className="text-muted-foreground">
                    Select a completed batch to replay the trip
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline controls */}
          {selectedBatchId && (
            <TimelineControls
              events={events}
              timeRange={timeRange}
              onTimeChange={handleTimeChange}
            />
          )}
        </div>

        {/* Analytics sidebar */}
        {selectedBatchId && (
          <PlaybackAnalytics
            analytics={analytics}
            stopAnalytics={stopAnalytics}
            batchName={selectedBatch?.name}
          />
        )}
      </div>
    </div>
  );
}

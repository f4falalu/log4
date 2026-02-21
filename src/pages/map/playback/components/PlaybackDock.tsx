/**
 * PlaybackDock Component
 *
 * Bottom control bar with:
 * - Timeline scrubber with event markers
 * - Playback controls (play/pause, skip, jump)
 * - Speed selector
 * - Time display
 *
 * All time updates flow through PlaybackStore - no local state
 */

import { useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlaybackStore } from '@/stores/playbackStore';
import { formatDuration } from '@/lib/playback-utils';

interface PlaybackDockProps {
  className?: string;
}

const SPEED_OPTIONS = [
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '5', label: '5x' },
  { value: '10', label: '10x' },
] as const;

export function PlaybackDock({ className }: PlaybackDockProps) {
  const tripData = usePlaybackStore((state) => state.tripData);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const speedMultiplier = usePlaybackStore((state) => state.speedMultiplier);

  const togglePlayPause = usePlaybackStore((state) => state.togglePlayPause);
  const pause = usePlaybackStore((state) => state.pause);
  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const skipForward = usePlaybackStore((state) => state.skipForward);
  const skipBackward = usePlaybackStore((state) => state.skipBackward);

  // Find nearest events for skip buttons
  const { prevEvent, nextEvent } = useMemo(() => {
    if (!tripData) return { prevEvent: null, nextEvent: null };

    const sortedEvents = [...tripData.events].sort(
      (a, b) => a.startTime - b.startTime
    );

    let prev = null;
    let next = null;

    for (const event of sortedEvents) {
      if (event.startTime < currentTime) {
        prev = event;
      } else if (event.startTime > currentTime && !next) {
        next = event;
        break;
      }
    }

    return { prevEvent: prev, nextEvent: next };
  }, [tripData, currentTime]);

  // Jump to previous event
  const handlePrevEvent = useCallback(() => {
    if (prevEvent) {
      setCurrentTime(prevEvent.startTime);
      pause();
    }
  }, [prevEvent, setCurrentTime, pause]);

  // Jump to next event
  const handleNextEvent = useCallback(() => {
    if (nextEvent) {
      setCurrentTime(nextEvent.startTime);
      pause();
    }
  }, [nextEvent, setCurrentTime, pause]);

  // Calculate slider value (0-100)
  const sliderValue = useMemo(() => {
    if (!tripData) return 0;
    const range = tripData.endTime - tripData.startTime;
    if (range === 0) return 0;
    const current = currentTime - tripData.startTime;
    return Math.min(100, Math.max(0, (current / range) * 100));
  }, [tripData, currentTime]);

  // Handle slider change (scrubbing)
  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (!tripData) return;

      const range = tripData.endTime - tripData.startTime;
      const newTime = tripData.startTime + (value[0] / 100) * range;

      setCurrentTime(newTime);
      pause(); // Pause on scrub
    },
    [tripData, setCurrentTime, pause]
  );

  // Handle speed change
  const handleSpeedChange = useCallback(
    (value: string) => {
      const speed = parseInt(value) as 1 | 2 | 5 | 10;
      setSpeed(speed);
    },
    [setSpeed]
  );

  // Format time for display
  const formatTime = useCallback((timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    }).format(new Date(timestamp));
  }, []);

  // Event markers for timeline
  const eventMarkers = useMemo(() => {
    if (!tripData) return [];

    const range = tripData.endTime - tripData.startTime;
    if (range === 0) return [];

    return tripData.events.map((event) => {
      const position =
        ((event.startTime - tripData.startTime) / range) * 100;

      // Color by event type
      let color = '#3b82f6'; // blue default
      switch (event.type) {
        case 'arrival':
          color = '#22c55e'; // green
          break;
        case 'departure':
          color = '#3b82f6'; // blue
          break;
        case 'delay':
          color = '#ef4444'; // red
          break;
        case 'deviation':
          color = '#f59e0b'; // amber
          break;
        case 'proof':
          color = '#8b5cf6'; // purple
          break;
      }

      return {
        id: event.id,
        position,
        color,
        type: event.type,
        time: event.startTime,
      };
    });
  }, [tripData]);

  const isDisabled = !tripData;
  const elapsedTime = tripData ? currentTime - tripData.startTime : 0;
  const totalTime = tripData ? tripData.endTime - tripData.startTime : 0;

  return (
    <div
      className={`bg-background border-t transition-opacity ${
        isDisabled ? 'opacity-60' : ''
      } ${className || ''}`}
    >
      {/* Timeline Scrubber */}
      <div className="px-6 pt-4 pb-2">
        <div className="relative">
          {/* Event markers layer */}
          <div className="absolute inset-x-0 top-0 h-2 pointer-events-none z-10">
            {eventMarkers.map((marker) => (
              <div
                key={marker.id}
                className="absolute w-1.5 h-2 rounded-full transition-opacity hover:opacity-100"
                style={{
                  left: `${marker.position}%`,
                  backgroundColor: marker.color,
                }}
                title={`${marker.type} at ${formatTime(marker.time)}`}
              />
            ))}
          </div>

          {/* Slider */}
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.01}
            className="mt-3 cursor-pointer"
            disabled={isDisabled}
          />
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{tripData ? formatTime(tripData.startTime) : '--:--'}</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium text-foreground">
              {tripData ? formatTime(currentTime) : '--:--:--'}
            </span>
            <span className="text-muted-foreground">
              / {tripData ? formatDuration(totalTime / 1000) : '--:--'}
            </span>
          </div>
          <span>{tripData ? formatTime(tripData.endTime) : '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 pb-4">
        {/* Left: Main playback controls */}
        <div className="flex items-center gap-1">
          {/* Skip back 30s */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipBackward(30)}
            title="Skip back 30s"
            className="h-9 w-9"
            disabled={isDisabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Previous event */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevEvent}
            disabled={isDisabled || !prevEvent}
            title="Previous event"
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause (main button) */}
          <Button
            variant="default"
            size="icon"
            onClick={togglePlayPause}
            className="h-11 w-11 rounded-full"
            disabled={isDisabled}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Next event */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextEvent}
            disabled={isDisabled || !nextEvent}
            title="Next event"
            className="h-9 w-9"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Skip forward 30s */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skipForward(30)}
            title="Skip forward 30s"
            className="h-9 w-9"
            disabled={isDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Speed control */}
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <Select
            value={speedMultiplier.toString()}
            onValueChange={handleSpeedChange}
            disabled={isDisabled}
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: Progress indicator */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Elapsed:</span>
            <span className="font-medium text-foreground">
              {tripData ? formatDuration(elapsedTime / 1000) : '--:--'}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span>Remaining:</span>
            <span className="font-medium text-foreground">
              {tripData
                ? formatDuration((totalTime - elapsedTime) / 1000)
                : '--:--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

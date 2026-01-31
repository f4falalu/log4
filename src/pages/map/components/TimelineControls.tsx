/**
 * TimelineControls - Timeline scrubber and playback controls
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  MapPin,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLiveMapStore } from '@/stores/liveMapStore';
import type { PlaybackEvent } from '@/types/live-map';

interface TimelineControlsProps {
  events: PlaybackEvent[];
  timeRange: { start: Date; end: Date } | null;
  onTimeChange?: (time: Date) => void;
}

const SPEED_OPTIONS = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '5', label: '5x' },
  { value: '10', label: '10x' },
];

export function TimelineControls({
  events,
  timeRange,
  onTimeChange,
}: TimelineControlsProps) {
  const playback = useLiveMapStore((s) => s.playback);
  const setPlaybackCurrentTime = useLiveMapStore((s) => s.setPlaybackCurrentTime);
  const setPlaybackSpeed = useLiveMapStore((s) => s.setPlaybackSpeed);
  const togglePlayback = useLiveMapStore((s) => s.togglePlayback);
  const playPlayback = useLiveMapStore((s) => s.playPlayback);
  const pausePlayback = useLiveMapStore((s) => s.pausePlayback);
  const toggleStopMarkers = useLiveMapStore((s) => s.toggleStopMarkers);
  const toggleStartEndMarkers = useLiveMapStore((s) => s.toggleStartEndMarkers);

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Format time for display
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    }).format(date);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Calculate slider value (0-100)
  const getSliderValue = useCallback(() => {
    if (!timeRange || !playback.currentTime) return 0;
    const range = timeRange.end.getTime() - timeRange.start.getTime();
    if (range === 0) return 0;
    const current = playback.currentTime.getTime() - timeRange.start.getTime();
    return Math.min(100, Math.max(0, (current / range) * 100));
  }, [timeRange, playback.currentTime]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (!timeRange) return;
      const range = timeRange.end.getTime() - timeRange.start.getTime();
      const newTime = new Date(timeRange.start.getTime() + (value[0] / 100) * range);
      setPlaybackCurrentTime(newTime);
      onTimeChange?.(newTime);
    },
    [timeRange, setPlaybackCurrentTime, onTimeChange]
  );

  // Handle speed change
  const handleSpeedChange = useCallback(
    (value: string) => {
      setPlaybackSpeed(parseFloat(value));
    },
    [setPlaybackSpeed]
  );

  // Jump to next event
  const jumpToNextEvent = useCallback(() => {
    if (!playback.currentTime || events.length === 0) return;

    const nextEvent = events.find(
      (e) => e.timestamp > playback.currentTime!
    );

    if (nextEvent) {
      setPlaybackCurrentTime(nextEvent.timestamp);
      onTimeChange?.(nextEvent.timestamp);
    }
  }, [playback.currentTime, events, setPlaybackCurrentTime, onTimeChange]);

  // Jump to previous event
  const jumpToPreviousEvent = useCallback(() => {
    if (!playback.currentTime || events.length === 0) return;

    let prevEvent: PlaybackEvent | null = null;
    for (const event of events) {
      if (event.timestamp < playback.currentTime!) {
        prevEvent = event;
      } else {
        break;
      }
    }

    if (prevEvent) {
      setPlaybackCurrentTime(prevEvent.timestamp);
      onTimeChange?.(prevEvent.timestamp);
    }
  }, [playback.currentTime, events, setPlaybackCurrentTime, onTimeChange]);

  // Animation loop
  useEffect(() => {
    if (!playback.isPlaying || !timeRange) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaMs = (timestamp - lastTimeRef.current) * playback.speed;
      lastTimeRef.current = timestamp;

      const currentTime = playback.currentTime || timeRange.start;
      const newTime = new Date(currentTime.getTime() + deltaMs);

      // Check if we've reached the end
      if (newTime >= timeRange.end) {
        setPlaybackCurrentTime(timeRange.end);
        onTimeChange?.(timeRange.end);
        pausePlayback();
        return;
      }

      setPlaybackCurrentTime(newTime);
      onTimeChange?.(newTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    playback.isPlaying,
    playback.speed,
    playback.currentTime,
    timeRange,
    setPlaybackCurrentTime,
    pausePlayback,
    onTimeChange,
  ]);

  // Get event markers for timeline
  const eventMarkers = events
    .filter((e) => ['ARRIVED_AT_STOP', 'DEPARTED_STOP', 'ROUTE_STARTED', 'ROUTE_COMPLETED'].includes(e.eventType))
    .map((e) => {
      if (!timeRange) return null;
      const range = timeRange.end.getTime() - timeRange.start.getTime();
      const position = ((e.timestamp.getTime() - timeRange.start.getTime()) / range) * 100;
      return {
        position,
        type: e.eventType,
        time: e.timestamp,
      };
    })
    .filter(Boolean);

  if (!timeRange) {
    return (
      <div className="bg-background/95 border-t p-4">
        <div className="text-center text-muted-foreground">
          Select a batch to view playback timeline
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/95 border-t">
      {/* Timeline scrubber */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          {/* Event markers */}
          <div className="absolute inset-x-0 top-0 h-2 pointer-events-none">
            {eventMarkers.map((marker, i) => (
              <div
                key={i}
                className="absolute w-1 h-2 rounded-full"
                style={{
                  left: `${marker?.position}%`,
                  backgroundColor:
                    marker?.type === 'ARRIVED_AT_STOP'
                      ? '#22c55e'
                      : marker?.type === 'DEPARTED_STOP'
                        ? '#3b82f6'
                        : '#f59e0b',
                }}
                title={`${marker?.type} at ${formatTime(marker?.time!)}`}
              />
            ))}
          </div>

          {/* Slider */}
          <Slider
            value={[getSliderValue()]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="mt-3"
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatTime(timeRange.start)}</span>
          <span className="font-medium text-foreground">
            {playback.currentTime ? formatTime(playback.currentTime) : '--:--:--'}
          </span>
          <span>{formatTime(timeRange.end)}</span>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {playback.currentTime ? formatDate(playback.currentTime) : formatDate(timeRange.start)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 pb-4">
        {/* Left: Skip and play controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={jumpToPreviousEvent}
            title="Previous event"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={togglePlayback}
            className="h-10 w-10"
          >
            {playback.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={jumpToNextEvent}
            title="Next event"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Speed selector */}
        <div className="flex items-center gap-2">
          <FastForward className="h-4 w-4 text-muted-foreground" />
          <Select
            value={playback.speed.toString()}
            onValueChange={handleSpeedChange}
          >
            <SelectTrigger className="w-20 h-8">
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

        {/* Right: Toggle options */}
        <div className="flex items-center gap-1">
          <Toggle
            pressed={playback.showStopMarkers}
            onPressedChange={toggleStopMarkers}
            size="sm"
            title="Show stop markers"
          >
            <MapPin className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={playback.showStartEndMarkers}
            onPressedChange={toggleStartEndMarkers}
            size="sm"
            title="Show start/end markers"
          >
            <Flag className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
}

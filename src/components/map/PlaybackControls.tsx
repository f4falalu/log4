/**
 * PlaybackControls.tsx
 *
 * Playback controls for historical route replay
 * Wrapped in ControlSurface for guaranteed contrast on any basemap
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  FastForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ControlSurface } from './ui/ControlSurface';
import { ICON_STATE } from '@/lib/mapDesignSystem';

/**
 * Playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Playback speed options
 */
export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

/**
 * Playback Controls Props
 */
export interface PlaybackControlsProps {
  /** Current playback state */
  state: PlaybackState;

  /** Current playback speed */
  speed: PlaybackSpeed;

  /** Current timestamp being displayed */
  currentTimestamp: string | null;

  /** Start timestamp of available data */
  startTimestamp: string;

  /** End timestamp of available data */
  endTimestamp: string;

  /** Callback when play button clicked */
  onPlay: () => void;

  /** Callback when pause button clicked */
  onPause: () => void;

  /** Callback when stop button clicked */
  onStop: () => void;

  /** Callback when skip backward button clicked */
  onSkipBackward: () => void;

  /** Callback when skip forward button clicked */
  onSkipForward: () => void;

  /** Callback when speed changes */
  onSpeedChange: (speed: PlaybackSpeed) => void;

  /** Callback when user wants to jump to timestamp */
  onJumpToTimestamp?: (timestamp: string) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Custom className */
  className?: string;

  /** Compact mode (smaller UI) */
  compact?: boolean;
}

/**
 * Playback Controls Component
 *
 * Features:
 * - Play/Pause/Stop controls
 * - Skip forward/backward
 * - Playback speed selection (0.5x, 1x, 2x, 5x, 10x)
 * - Current timestamp display
 * - Progress indicator
 */
export function PlaybackControls({
  state,
  speed,
  currentTimestamp,
  startTimestamp,
  endTimestamp,
  onPlay,
  onPause,
  onStop,
  onSkipBackward,
  onSkipForward,
  onSpeedChange,
  onJumpToTimestamp,
  disabled = false,
  className = '',
  compact = false,
}: PlaybackControlsProps) {
  /**
   * Validate timestamp string
   */
  const isValidTimestamp = (timestamp: string | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp || !isValidTimestamp(timestamp)) return '--:--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Format date for display
   */
  const formatDate = (timestamp: string): string => {
    if (!isValidTimestamp(timestamp)) return 'Invalid Date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Calculate playback progress (0-100)
   */
  const calculateProgress = (): number => {
    if (!currentTimestamp || !isValidTimestamp(currentTimestamp)) return 0;
    if (!isValidTimestamp(startTimestamp) || !isValidTimestamp(endTimestamp)) return 0;

    const start = new Date(startTimestamp).getTime();
    const end = new Date(endTimestamp).getTime();
    const current = new Date(currentTimestamp).getTime();

    // Guard against invalid range
    if (end <= start) return 0;

    if (current < start) return 0;
    if (current > end) return 100;

    return Math.round(((current - start) / (end - start)) * 100);
  };

  const progress = calculateProgress();

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = () => {
    if (state === 'playing') {
      onPause();
    } else {
      onPlay();
    }
  };

  /**
   * Handle jump to start
   */
  const handleJumpToStart = () => {
    if (onJumpToTimestamp) {
      onJumpToTimestamp(startTimestamp);
    }
  };

  /**
   * Handle jump to end
   */
  const handleJumpToEnd = () => {
    if (onJumpToTimestamp) {
      onJumpToTimestamp(endTimestamp);
    }
  };

  if (compact) {
    return (
      <ControlSurface variant="playback" position="bottom-center" className={cn('flex-row items-center', className)}>
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          disabled={disabled}
          className={cn(
            'h-8 w-8',
            disabled ? ICON_STATE.disabled : ICON_STATE.default
          )}
        >
          {state === 'playing' ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onStop}
          disabled={disabled || state === 'stopped'}
          className={cn(
            'h-8 w-8',
            (disabled || state === 'stopped') ? ICON_STATE.disabled : ICON_STATE.default
          )}
        >
          <Square className="h-4 w-4" />
        </Button>

        {/* Speed */}
        <Badge variant="outline" className="text-xs px-2 py-0.5">
          {speed}x
        </Badge>

        {/* Progress */}
        <Badge variant="secondary" className="text-xs px-2 py-0.5">
          {progress}%
        </Badge>
      </ControlSurface>
    );
  }

  return (
    <ControlSurface variant="playback" position="bottom-center" className={className}>
      <div className="flex flex-col gap-3 min-w-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">Playback Controls</h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(startTimestamp)} - {formatDate(endTimestamp)}
            </p>
          </div>
          <Badge
            variant={state === 'playing' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {state === 'playing' ? 'Playing' : state === 'paused' ? 'Paused' : 'Stopped'}
          </Badge>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">
            {formatTimestamp(currentTimestamp)}
          </span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-muted-foreground">
            {formatTimestamp(endTimestamp)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Jump to start */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleJumpToStart}
            disabled={disabled || !onJumpToTimestamp}
            title="Jump to start"
            className={cn(
              (disabled || !onJumpToTimestamp) ? ICON_STATE.disabled : ICON_STATE.default
            )}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Skip backward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipBackward}
            disabled={disabled}
            title="Skip backward (1 minute)"
            className={cn(
              disabled ? ICON_STATE.disabled : ICON_STATE.default
            )}
          >
            <FastForward className="h-4 w-4 rotate-180" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            disabled={disabled}
            className={cn(
              'h-10 w-10',
              state === 'playing' ? ICON_STATE.active : ICON_STATE.default,
              disabled && ICON_STATE.disabled
            )}
          >
            {state === 'playing' ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Skip forward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkipForward}
            disabled={disabled}
            title="Skip forward (1 minute)"
            className={cn(
              disabled ? ICON_STATE.disabled : ICON_STATE.default
            )}
          >
            <FastForward className="h-4 w-4" />
          </Button>

          {/* Jump to end */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleJumpToEnd}
            disabled={disabled || !onJumpToTimestamp}
            title="Jump to end"
            className={cn(
              (disabled || !onJumpToTimestamp) ? ICON_STATE.disabled : ICON_STATE.default
            )}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Stop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            disabled={disabled || state === 'stopped'}
            title="Stop playback"
            className={cn(
              (disabled || state === 'stopped') ? ICON_STATE.disabled : ICON_STATE.default
            )}
          >
            <Square className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Speed selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Speed:</span>
            <Select
              value={speed.toString()}
              onValueChange={(value) => onSpeedChange(parseFloat(value) as PlaybackSpeed)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="5">5x</SelectItem>
                <SelectItem value="10">10x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress: {progress}%</span>
          {state === 'playing' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
              Playing at {speed}x speed
            </span>
          )}
        </div>
      </div>
    </ControlSurface>
  );
}

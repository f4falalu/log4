/**
 * ForensicMap.tsx
 *
 * Forensic mode map adapter.
 *
 * GOVERNANCE:
 * - ForensicMap does NOT implement logic
 * - It CONFIGURES the map system for time-based replay
 * - React never calls MapLibre directly
 * - FSM locked to 'inspect' (read-only)
 * - Requires time context
 *
 * RESPONSIBILITIES:
 * - Initialize MapShell
 * - Register layers via LayerRegistry
 * - Bind ForensicPolicy to InteractionFSM
 * - Wire ForensicReplayAdapter + ForensicTimelineController
 * - Mount ForensicTimelineBar
 * - Pass callbacks only
 *
 * FORBIDDEN:
 * - No MapLibre calls
 * - No geometry math
 * - No H3 logic
 * - No spatial mutation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapShell } from '@/map/core/MapShell';
import { LayerRegistry } from '@/map/core/LayerRegistry';
import { interactionFSM } from '@/map/core/InteractionFSM';
import { createRenderContext, findLabelLayer } from '@/map/core/rendering';
import { getBaseStyleUrl, DEFAULT_BASE_STYLE } from '@/map/core/rendering/BaseMapLayer';
import { H3HexagonLayerNew } from '@/map/layers/H3HexagonLayerNew';
import { ReplayEntityLayer } from '@/map/layers/ReplayEntityLayer';
import {
  ForensicReplayAdapter,
  type ReplayDataSource,
} from './ForensicReplayAdapter';
import {
  ForensicTimelineController,
  type PlaybackSpeed,
} from './ForensicTimelineController';
import { ForensicTimelineBar } from './ForensicTimelineBar';
import { cn } from '@/lib/utils';

/**
 * Props
 */
interface ForensicMapProps {
  /** Start of time range */
  startTime: Date;

  /** End of time range */
  endTime: Date;

  /** Current playback time (controlled externally) */
  currentTime?: Date;

  /** Replay data source */
  replayData?: ReplayDataSource;

  /** Whether playback is active */
  isPlaying?: boolean;

  /** Playback speed */
  playbackSpeed?: PlaybackSpeed;

  /** Time change callback */
  onTimeChange?: (time: Date) => void;

  /** Initial center [lng, lat] */
  center?: [number, number];

  /** Initial zoom */
  zoom?: number;

  /** Dark mode */
  isDarkMode?: boolean;

  /** Additional class name */
  className?: string;
}

/**
 * ForensicMap - Mode adapter for Forensic
 *
 * Read-only, time-based replay. FSM locked to 'inspect'.
 * Reconstructs state from historical data at any point in time.
 */
export function ForensicMap({
  startTime,
  endTime,
  currentTime,
  replayData,
  isPlaying = false,
  playbackSpeed = 1,
  onTimeChange,
  center = DEFAULT_BASE_STYLE.defaultCenter,
  zoom = DEFAULT_BASE_STYLE.defaultZoom,
  isDarkMode = false,
  className,
}: ForensicMapProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<MapShell | null>(null);
  const layerRegistryRef = useRef<LayerRegistry | null>(null);
  const replayAdapterRef = useRef<ForensicReplayAdapter | null>(null);
  const timelineRef = useRef<ForensicTimelineController | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [internalTime, setInternalTime] = useState<Date>(currentTime ?? startTime);
  const [internalPlaying, setInternalPlaying] = useState(isPlaying);
  const [internalSpeed, setInternalSpeed] = useState<PlaybackSpeed>(playbackSpeed);

  // Stable callback ref
  const onTimeChangeRef = useRef(onTimeChange);
  onTimeChangeRef.current = onTimeChange;

  // Track last externally-set time to prevent re-render loops
  const lastExternalTimeRef = useRef<number | null>(null);

  // Render frame at a given time
  const renderFrameAtTime = useCallback((time: Date) => {
    if (!replayAdapterRef.current || !layerRegistryRef.current) return;

    const frame = replayAdapterRef.current.getFrameAt(time);
    if (frame) {
      layerRegistryRef.current.update('h3-hexagon', frame.cellStates);
      layerRegistryRef.current.update('replay-entities', frame.entities);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    // Set FSM mode (locks to 'inspect')
    interactionFSM.setMode('forensic');

    // Create MapShell
    const shell = new MapShell(containerRef.current, {
      style: getBaseStyleUrl(isDarkMode),
      center,
      zoom,
      minZoom: DEFAULT_BASE_STYLE.minZoom,
      maxZoom: DEFAULT_BASE_STYLE.maxZoom,
    });
    mapShellRef.current = shell;

    // Create LayerRegistry
    const registry = new LayerRegistry();
    layerRegistryRef.current = registry;

    // When map is ready
    shell.onReady(() => {
      const map = shell.getMap();
      if (!map) return;

      // Create render context
      const labelAnchor = findLabelLayer(map);
      const ctx = createRenderContext(map, {
        beforeLayerId: labelAnchor,
        isDarkMode,
        mode: 'forensic',
      });

      registry.setRenderContext(ctx);

      // Register H3 layer for historical zone display
      const h3Layer = new H3HexagonLayerNew({ showOnlyZoned: true });
      registry.register(h3Layer);

      // Register replay entity layer
      const replayLayer = new ReplayEntityLayer();
      registry.register(replayLayer);

      // Mount all layers
      registry.mountAll();

      // Create ForensicReplayAdapter
      const adapter = new ForensicReplayAdapter();
      if (replayData) {
        adapter.loadData(replayData);
      }
      replayAdapterRef.current = adapter;

      // Create ForensicTimelineController
      const timeline = new ForensicTimelineController({
        startTime,
        endTime,
        initialTime: currentTime ?? startTime,
        onTimeChange: (event) => {
          // Render frame at new time
          const frame = adapter.getFrameAt(event.currentTime);
          if (frame) {
            registry.update('h3-hexagon', frame.cellStates);
            registry.update('replay-entities', frame.entities);
          }

          // Update ref so external sync effect doesn't re-apply same time
          lastExternalTimeRef.current = event.currentTime.getTime();
          setInternalTime(event.currentTime);
          setInternalPlaying(event.playbackState === 'playing');
          onTimeChangeRef.current?.(event.currentTime);
        },
      });
      timelineRef.current = timeline;

      // Render initial frame
      const initialFrame = adapter.getFrameAt(currentTime ?? startTime);
      if (initialFrame) {
        registry.update('h3-hexagon', initialFrame.cellStates);
        registry.update('replay-entities', initialFrame.entities);
      }

      setIsReady(true);
    });

    // Cleanup
    return () => {
      timelineRef.current?.destroy();
      layerRegistryRef.current?.removeAll();
      mapShellRef.current?.destroy();
      mapShellRef.current = null;
      layerRegistryRef.current = null;
      replayAdapterRef.current = null;
      timelineRef.current = null;
      setIsReady(false);
    };
  }, [isDarkMode]);

  // Sync external isPlaying
  useEffect(() => {
    if (!timelineRef.current || !isReady) return;

    if (isPlaying && timelineRef.current.getState() !== 'playing') {
      timelineRef.current.play();
      setInternalPlaying(true);
    } else if (!isPlaying && timelineRef.current.getState() === 'playing') {
      timelineRef.current.pause();
      setInternalPlaying(false);
    }
  }, [isPlaying, isReady]);

  // Sync external speed
  useEffect(() => {
    if (!timelineRef.current || !isReady) return;
    timelineRef.current.setSpeed(playbackSpeed);
    setInternalSpeed(playbackSpeed);
  }, [playbackSpeed, isReady]);

  // Sync external time seek (compare by value to avoid re-render loops from new Date references)
  useEffect(() => {
    if (!timelineRef.current || !isReady || !currentTime) return;
    const timeMs = currentTime.getTime();
    if (lastExternalTimeRef.current === timeMs) return;
    lastExternalTimeRef.current = timeMs;
    timelineRef.current.setTime(currentTime);
  }, [currentTime, isReady]);

  // Sync replay data
  useEffect(() => {
    if (!replayAdapterRef.current || !isReady || !replayData) return;
    replayAdapterRef.current.loadData(replayData);
    renderFrameAtTime(internalTime);
  }, [replayData, isReady, renderFrameAtTime]);

  // Timeline bar callbacks
  const handlePlayPause = useCallback(() => {
    if (!timelineRef.current) return;
    timelineRef.current.toggle();
    setInternalPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((time: Date) => {
    timelineRef.current?.setTime(time);
  }, []);

  const handleSpeedChange = useCallback((speed: PlaybackSpeed) => {
    timelineRef.current?.setSpeed(speed);
    setInternalSpeed(speed);
  }, []);

  const handleStepForward = useCallback(() => {
    timelineRef.current?.stepForward(60000); // 1 minute
  }, []);

  const handleStepBackward = useCallback(() => {
    timelineRef.current?.stepBackward(60000); // 1 minute
  }, []);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {/* Timeline controls */}
      {isReady && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-[640px]">
          <ForensicTimelineBar
            currentTime={internalTime}
            startTime={startTime}
            endTime={endTime}
            isPlaying={internalPlaying}
            speed={internalSpeed}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
          />
        </div>
      )}

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}

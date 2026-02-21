/**
 * usePlaybackAnimation Hook
 *
 * Core RAF (requestAnimationFrame) loop for playback engine
 *
 * Responsibilities:
 * 1. Manages animation loop when playing
 * 2. Updates currentTime based on speedMultiplier
 * 3. Updates activePositionIndex (forward-only incremental)
 * 4. Updates activeEvents (window-based activation)
 * 5. Interpolates position between GPS points
 * 6. Handles play/pause/scrub
 * 7. Cleanup on unmount
 *
 * This is the deterministic time machine that drives the entire UI.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePlaybackStore } from '@/stores/playbackStore';
import {
  interpolatePosition,
  binarySearchPosition,
} from '@/lib/playback-utils';
import type { InterpolatedPosition, IndexedEvent } from '@/types/live-map';

interface UsePlaybackAnimationReturn {
  interpolatedPosition: InterpolatedPosition | null;
  activeEvents: IndexedEvent[];
  completedDistance: number;
  progress: number; // Percentage (0-100)
}

/**
 * Playback animation hook
 *
 * This hook manages the core playback loop and provides derived state
 * for map rendering.
 *
 * Returns interpolated position and active events for current time.
 */
export function usePlaybackAnimation(): UsePlaybackAnimationReturn {
  const tripData = usePlaybackStore((state) => state.tripData);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const speedMultiplier = usePlaybackStore((state) => state.speedMultiplier);
  const activePositionIndex = usePlaybackStore(
    (state) => state.activePositionIndex
  );

  const setCurrentTime = usePlaybackStore((state) => state.setCurrentTime);
  const setActivePositionIndex = usePlaybackStore(
    (state) => state.setActivePositionIndex
  );
  const setActiveEvents = usePlaybackStore((state) => state.setActiveEvents);
  const pause = usePlaybackStore((state) => state.pause);

  // RAF loop refs
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>();

  // Next event indices for efficient event activation
  const nextEventStartIndexRef = useRef<number>(0);
  const nextEventEndIndexRef = useRef<number>(0);

  /**
   * Update active events based on currentTime
   * Uses sorted event array + index pointers for O(k) complexity where k = active events
   */
  const updateActiveEvents = useCallback(
    (time: number) => {
      if (!tripData) return;

      const activeEventIds = new Set<string>();
      const { events } = tripData;

      // Find all events active at current time
      for (const event of events) {
        const isActive =
          event.startTime <= time &&
          (event.endTime === undefined || event.endTime >= time);

        if (isActive) {
          activeEventIds.add(event.id);
        }
      }

      setActiveEvents(activeEventIds);
    },
    [tripData, setActiveEvents]
  );

  /**
   * Update position index (forward-only incremental search)
   * This is much faster than binary search when playing forward
   */
  const updatePositionIndex = useCallback(
    (time: number, currentIndex: number) => {
      if (!tripData) return currentIndex;

      const { gps } = tripData;
      let newIndex = currentIndex;

      // Forward search (incremental)
      while (
        newIndex < gps.length - 1 &&
        gps[newIndex + 1].timestamp <= time
      ) {
        newIndex++;
      }

      if (newIndex !== currentIndex) {
        setActivePositionIndex(newIndex);
      }

      return newIndex;
    },
    [tripData, setActivePositionIndex]
  );

  /**
   * Main animation loop
   * Uses requestAnimationFrame for smooth 60fps playback
   */
  useEffect(() => {
    if (!isPlaying || !tripData) {
      // Clear RAF when paused
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
        lastFrameTimeRef.current = undefined;
      }
      return;
    }

    const loop = (timestamp: number) => {
      // Calculate time delta
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Update current time based on speed multiplier
      const timeIncrement = delta * speedMultiplier;
      const newTime = currentTime + timeIncrement;

      // Check if reached end
      if (newTime >= tripData.endTime) {
        setCurrentTime(tripData.endTime);
        updateActiveEvents(tripData.endTime);
        pause();
        return;
      }

      // Update time in store
      setCurrentTime(newTime);

      // Update position index (incremental forward search)
      updatePositionIndex(newTime, activePositionIndex);

      // Update active events
      updateActiveEvents(newTime);

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    // Start animation loop
    lastFrameTimeRef.current = undefined;
    animationFrameRef.current = requestAnimationFrame(loop);

    // Cleanup on unmount or when paused
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
        lastFrameTimeRef.current = undefined;
      }
    };
  }, [
    isPlaying,
    currentTime,
    speedMultiplier,
    tripData,
    activePositionIndex,
    setCurrentTime,
    updatePositionIndex,
    updateActiveEvents,
    pause,
  ]);

  /**
   * Handle scrubbing (when currentTime changes externally)
   * Use binary search for random access
   */
  useEffect(() => {
    if (!tripData || isPlaying) return;

    // Recalculate position index when scrubbing
    const newIndex = binarySearchPosition(tripData.gps, currentTime);
    if (newIndex !== -1 && newIndex !== activePositionIndex) {
      setActivePositionIndex(newIndex);
    }

    // Recalculate active events
    updateActiveEvents(currentTime);
  }, [
    currentTime,
    tripData,
    isPlaying,
    activePositionIndex,
    setActivePositionIndex,
    updateActiveEvents,
  ]);

  /**
   * Compute interpolated position for current time
   */
  const interpolatedPosition = tripData
    ? interpolatePosition(currentTime, tripData.gps, activePositionIndex)
    : null;

  /**
   * Get active events
   */
  const activeEvents = tripData
    ? tripData.events.filter((e) =>
        usePlaybackStore.getState().activeEvents.has(e.id)
      )
    : [];

  /**
   * Compute completed distance
   */
  const completedDistance = tripData
    ? tripData.cumulativeDistances[activePositionIndex] || 0
    : 0;

  /**
   * Compute progress percentage
   */
  const progress = tripData
    ? ((currentTime - tripData.startTime) /
        (tripData.endTime - tripData.startTime)) *
      100
    : 0;

  return {
    interpolatedPosition,
    activeEvents,
    completedDistance,
    progress,
  };
}

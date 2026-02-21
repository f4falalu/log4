/**
 * PlaybackStore - Zustand store for time-synchronized playback
 *
 * Core Principle: Everything derives from currentTime
 * This is the single source of truth for the playback engine
 */

import { create } from 'zustand';
import type { NormalizedTrip } from '@/types/live-map';

export interface PlaybackState {
  // Trip Selection
  selectedBatchId: string | null;
  tripData: NormalizedTrip | null;

  // Playback Engine State (deterministic, derived from currentTime)
  currentTime: number; // Unix timestamp in milliseconds
  isPlaying: boolean;
  speedMultiplier: 1 | 2 | 5 | 10;
  activePositionIndex: number; // Current GPS point index
  activeEvents: Set<string>; // Event IDs active at currentTime

  // UI State
  viewMode: 'route-intelligence' | 'event-analytics';
  highlightedStopId: string | null;
  highlightedEventId: string | null;

  // Map Overlays (toggleable visual layers)
  showPlannedRoute: boolean;
  showSpeedHeatmap: boolean;
  showStopHeatmap: boolean;
  showDeviations: boolean;

  // Actions
  selectBatch: (id: string | null) => void;
  setTripData: (trip: NormalizedTrip | null) => void;
  setCurrentTime: (time: number) => void;
  setActivePositionIndex: (index: number) => void;
  setActiveEvents: (events: Set<string>) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  setSpeed: (multiplier: 1 | 2 | 5 | 10) => void;
  jumpToEvent: (eventId: string) => void;
  jumpToStop: (stopId: string) => void;
  jumpToTime: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  setViewMode: (mode: 'route-intelligence' | 'event-analytics') => void;
  setHighlightedStop: (stopId: string | null) => void;
  setHighlightedEvent: (eventId: string | null) => void;
  togglePlannedRoute: () => void;
  toggleSpeedHeatmap: () => void;
  toggleStopHeatmap: () => void;
  toggleDeviations: () => void;
  reset: () => void;
}

const initialState = {
  selectedBatchId: null,
  tripData: null,
  currentTime: 0,
  isPlaying: false,
  speedMultiplier: 1 as const,
  activePositionIndex: 0,
  activeEvents: new Set<string>(),
  viewMode: 'event-analytics' as const,
  highlightedStopId: null,
  highlightedEventId: null,
  showPlannedRoute: true,
  showSpeedHeatmap: false,
  showStopHeatmap: false,
  showDeviations: true,
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  ...initialState,

  // Batch Selection
  selectBatch: (id) => {
    set({ selectedBatchId: id });
    // Reset playback state when batch changes
    if (!id) {
      set({
        tripData: null,
        currentTime: 0,
        isPlaying: false,
        activePositionIndex: 0,
        activeEvents: new Set(),
      });
    }
  },

  // Set normalized trip data
  setTripData: (trip) => {
    set({
      tripData: trip,
      currentTime: trip ? trip.startTime : 0,
      isPlaying: false,
      activePositionIndex: 0,
      activeEvents: new Set(),
    });
  },

  // Core time control (single source of truth)
  setCurrentTime: (time) => {
    const { tripData } = get();
    if (!tripData) return;

    // Clamp time to valid range
    const clampedTime = Math.max(
      tripData.startTime,
      Math.min(tripData.endTime, time)
    );

    set({ currentTime: clampedTime });

    // Pause if reached end
    if (clampedTime >= tripData.endTime) {
      set({ isPlaying: false });
    }
  },

  // Update active position index (managed by animation hook)
  setActivePositionIndex: (index) => set({ activePositionIndex: index }),

  // Update active events (managed by animation hook)
  setActiveEvents: (events) => set({ activeEvents: events }),

  // Playback controls
  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlayPause: () => {
    const { isPlaying, tripData, currentTime } = get();

    // If at end, restart from beginning
    if (tripData && currentTime >= tripData.endTime) {
      set({ currentTime: tripData.startTime, isPlaying: true });
    } else {
      set({ isPlaying: !isPlaying });
    }
  },

  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),

  // Jump to specific event
  jumpToEvent: (eventId) => {
    const { tripData } = get();
    if (!tripData) return;

    const event = tripData.events.find((e) => e.id === eventId);
    if (event) {
      set({
        currentTime: event.startTime,
        highlightedEventId: eventId,
        isPlaying: false, // Pause on jump
      });
    }
  },

  // Jump to specific stop
  jumpToStop: (stopId) => {
    const { tripData } = get();
    if (!tripData) return;

    const stop = tripData.stops.find((s) => s.facilityId === stopId);
    if (stop) {
      set({
        currentTime: stop.arrivalTime.getTime(),
        highlightedStopId: stopId,
        isPlaying: false, // Pause on jump
      });
    }
  },

  // Jump to arbitrary time
  jumpToTime: (time) => {
    set({
      currentTime: time,
      isPlaying: false,
    });
  },

  // Skip forward/backward
  skipForward: (seconds) => {
    const { currentTime, tripData } = get();
    if (!tripData) return;

    const newTime = Math.min(
      tripData.endTime,
      currentTime + seconds * 1000
    );
    set({ currentTime: newTime });
  },

  skipBackward: (seconds) => {
    const { currentTime, tripData } = get();
    if (!tripData) return;

    const newTime = Math.max(
      tripData.startTime,
      currentTime - seconds * 1000
    );
    set({ currentTime: newTime });
  },

  // UI state
  setViewMode: (mode) => set({ viewMode: mode }),

  setHighlightedStop: (stopId) => set({ highlightedStopId: stopId }),

  setHighlightedEvent: (eventId) => set({ highlightedEventId: eventId }),

  // Map overlay toggles
  togglePlannedRoute: () =>
    set((state) => ({ showPlannedRoute: !state.showPlannedRoute })),

  toggleSpeedHeatmap: () =>
    set((state) => ({ showSpeedHeatmap: !state.showSpeedHeatmap })),

  toggleStopHeatmap: () =>
    set((state) => ({ showStopHeatmap: !state.showStopHeatmap })),

  toggleDeviations: () =>
    set((state) => ({ showDeviations: !state.showDeviations })),

  // Reset to initial state
  reset: () => set(initialState),
}));

// Selector hooks for optimized re-renders
export const usePlaybackTime = () =>
  usePlaybackStore((state) => state.currentTime);

export const usePlaybackIsPlaying = () =>
  usePlaybackStore((state) => state.isPlaying);

export const usePlaybackSpeed = () =>
  usePlaybackStore((state) => state.speedMultiplier);

export const usePlaybackTripData = () =>
  usePlaybackStore((state) => state.tripData);

export const usePlaybackViewMode = () =>
  usePlaybackStore((state) => state.viewMode);

export const usePlaybackOverlays = () =>
  usePlaybackStore((state) => ({
    showPlannedRoute: state.showPlannedRoute,
    showSpeedHeatmap: state.showSpeedHeatmap,
    showStopHeatmap: state.showStopHeatmap,
    showDeviations: state.showDeviations,
  }));

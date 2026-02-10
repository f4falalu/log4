import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlaybackPoint {
  timestamp: Date;
  lat: number;
  lng: number;
  sequence: number;
  facilityId?: string;
  facilityName?: string;
  status?: 'pending' | 'in_transit' | 'delivered';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: Date;
  speed: number; // 1x, 2x, 4x, 8x
  progress: number; // 0-100
}

interface UseMapPlaybackProps {
  entityId: string | null;
  entityType: 'driver' | 'vehicle' | 'batch' | null;
  startTime?: Date;
  endTime?: Date;
}

export function useMapPlayback({
  entityId,
  entityType,
  startTime,
  endTime,
}: UseMapPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(startTime || new Date());
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Fetch route history for playback
  const { data: routePoints = [], isLoading } = useQuery({
    queryKey: ['playback-route', entityType, entityId, startTime, endTime],
    queryFn: async () => {
      if (!entityId || !entityType) return [];

      if (entityType === 'batch') {
        // Fetch route history for batch
        const { data, error } = await supabase
          .from('route_history')
          .select(`
            *,
            facilities:facility_id (
              id,
              name,
              latitude,
              longitude
            )
          `)
          .eq('batch_id', entityId)
          .order('sequence_number');

        if (error) throw error;

        // Convert to playback points
        const points: PlaybackPoint[] = [];

        data?.forEach((stop, index) => {
          const facility = Array.isArray(stop.facilities) ? stop.facilities[0] : stop.facilities;

          if (facility) {
            // Add departure point from previous stop
            if (stop.actual_arrival) {
              points.push({
                timestamp: new Date(stop.actual_arrival),
                lat: facility.latitude,
                lng: facility.longitude,
                sequence: index * 2,
                facilityId: facility.id,
                facilityName: facility.name,
                status: 'delivered',
              });
            }

            // Add planned arrival point
            if (stop.planned_arrival) {
              points.push({
                timestamp: new Date(stop.planned_arrival),
                lat: facility.latitude,
                lng: facility.longitude,
                sequence: index * 2 + 1,
                facilityId: facility.id,
                facilityName: facility.name,
                status: stop.actual_arrival ? 'delivered' : 'pending',
              });
            }
          }
        });

        return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }

      // Fetch GPS tracking data for driver or vehicle
      if (entityType === 'driver') {
        const query = supabase
          .from('driver_gps_events')
          .select('*')
          .eq('driver_id', entityId)
          .order('captured_at', { ascending: true });

        // Apply time range filter if provided
        if (startTime) {
          query.gte('captured_at', startTime.toISOString());
        }
        if (endTime) {
          query.lte('captured_at', endTime.toISOString());
        }

        const { data, error } = await query.limit(1000);

        if (error) throw error;

        // Convert GPS events to playback points
        const points: PlaybackPoint[] = (data || []).map((gps, index) => ({
          timestamp: new Date(gps.captured_at),
          lat: gps.lat,
          lng: gps.lng,
          sequence: index,
          status: 'in_transit' as const,
        }));

        return points;
      }

      if (entityType === 'vehicle') {
        // For vehicle, find the associated driver(s) and get their GPS data
        const { data: batches } = await supabase
          .from('delivery_batches')
          .select('driver_id')
          .eq('vehicle_id', entityId)
          .in('status', ['in-progress', 'completed']);

        const driverIds = [...new Set((batches || []).map(b => b.driver_id).filter(Boolean))];

        if (driverIds.length === 0) return [];

        const query = supabase
          .from('driver_gps_events')
          .select('*')
          .in('driver_id', driverIds)
          .order('captured_at', { ascending: true });

        if (startTime) {
          query.gte('captured_at', startTime.toISOString());
        }
        if (endTime) {
          query.lte('captured_at', endTime.toISOString());
        }

        const { data, error } = await query.limit(1000);

        if (error) throw error;

        const points: PlaybackPoint[] = (data || []).map((gps, index) => ({
          timestamp: new Date(gps.captured_at),
          lat: gps.lat,
          lng: gps.lng,
          sequence: index,
          status: 'in_transit' as const,
        }));

        return points;
      }

      return [];
    },
    enabled: !!entityId && !!entityType,
  });

  // Calculate time bounds
  const timeStart = routePoints.length > 0 ? routePoints[0].timestamp : (startTime || new Date());
  const timeEnd = routePoints.length > 0 ? routePoints[routePoints.length - 1].timestamp : (endTime || new Date());
  const totalDuration = timeEnd.getTime() - timeStart.getTime();

  // Calculate current progress (0-100)
  const progress = totalDuration > 0
    ? Math.min(100, Math.max(0, ((currentTime.getTime() - timeStart.getTime()) / totalDuration) * 100))
    : 0;

  // Get current position by interpolating between route points
  const getCurrentPosition = useCallback((): PlaybackPoint | null => {
    if (routePoints.length === 0) return null;

    const currentTimestamp = currentTime.getTime();

    // Find the two points that bracket the current time
    for (let i = 0; i < routePoints.length - 1; i++) {
      const point1 = routePoints[i];
      const point2 = routePoints[i + 1];

      if (currentTimestamp >= point1.timestamp.getTime() && currentTimestamp <= point2.timestamp.getTime()) {
        // Interpolate between the two points
        const segmentDuration = point2.timestamp.getTime() - point1.timestamp.getTime();
        const segmentProgress = (currentTimestamp - point1.timestamp.getTime()) / segmentDuration;

        return {
          timestamp: currentTime,
          lat: point1.lat + (point2.lat - point1.lat) * segmentProgress,
          lng: point1.lng + (point2.lng - point1.lng) * segmentProgress,
          sequence: point1.sequence,
          facilityId: point1.facilityId,
          facilityName: point1.facilityName,
          status: 'in_transit',
        };
      }
    }

    // If before first point, return first point
    if (currentTimestamp < routePoints[0].timestamp.getTime()) {
      return routePoints[0];
    }

    // If after last point, return last point
    return routePoints[routePoints.length - 1];
  }, [routePoints, currentTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || routePoints.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Update current time based on speed
      // Speed multiplier affects how fast playback runs
      const playbackDeltaMs = deltaMs * speed;

      setCurrentTime((prevTime) => {
        const newTime = new Date(prevTime.getTime() + playbackDeltaMs);

        // Stop if we've reached the end
        if (newTime.getTime() >= timeEnd.getTime()) {
          setIsPlaying(false);
          return timeEnd;
        }

        return newTime;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, timeEnd, routePoints.length]);

  // Control functions
  const play = useCallback(() => {
    lastUpdateRef.current = Date.now();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const skipForward = useCallback((minutes: number = 15) => {
    const newTime = new Date(currentTime.getTime() + minutes * 60000);
    setCurrentTime(newTime > timeEnd ? timeEnd : newTime);
  }, [currentTime, timeEnd]);

  const skipBackward = useCallback((minutes: number = 15) => {
    const newTime = new Date(currentTime.getTime() - minutes * 60000);
    setCurrentTime(newTime < timeStart ? timeStart : newTime);
  }, [currentTime, timeStart]);

  const setPlaybackTime = useCallback((time: Date) => {
    setCurrentTime(time);
  }, []);

  const setPlaybackProgress = useCallback((progressPercent: number) => {
    const newTimestamp = timeStart.getTime() + (totalDuration * progressPercent / 100);
    setCurrentTime(new Date(newTimestamp));
  }, [timeStart, totalDuration]);

  const cycleSpeed = useCallback(() => {
    setSpeed((prevSpeed) => {
      if (prevSpeed >= 8) return 1;
      return prevSpeed * 2;
    });
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(timeStart);
    setSpeed(1);
  }, [timeStart]);

  return {
    // State
    isPlaying,
    speed,
    currentTime,
    progress,
    timeStart,
    timeEnd,
    totalDuration,
    isLoading,

    // Route data
    routePoints,
    currentPosition: getCurrentPosition(),

    // Controls
    play,
    pause,
    togglePlayPause,
    skipForward,
    skipBackward,
    setPlaybackTime,
    setPlaybackProgress,
    cycleSpeed,
    reset,
  };
}

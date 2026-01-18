/**
 * useDebouncedMapData.ts
 *
 * Debounces map data updates to prevent excessive re-renders
 * Optimizes real-time updates for better performance
 */

import { useState, useEffect, useRef } from 'react';

interface UseDebouncedMapDataOptions {
  /** Debounce delay in milliseconds (default: 300) */
  delay?: number;
  /** Maximum wait time in milliseconds (default: 1000) */
  maxWait?: number;
  /** Enable leading edge trigger (default: false) */
  leading?: boolean;
}

/**
 * Debounce map data updates with intelligent batching
 *
 * @param data - Data to debounce
 * @param options - Debounce options
 * @returns Debounced data
 */
export function useDebouncedMapData<T>(
  data: T,
  options: UseDebouncedMapDataOptions = {}
): T {
  const { delay = 300, maxWait = 1000, leading = false } = options;

  const [debouncedData, setDebouncedData] = useState<T>(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Leading edge: update immediately on first call
    if (leading && !timeoutRef.current) {
      setDebouncedData(data);
      lastUpdateRef.current = now;
    }

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounce timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedData(data);
      lastUpdateRef.current = Date.now();
      timeoutRef.current = null;

      // Clear max wait timeout
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    }, delay);

    // Set max wait timeout (force update after maxWait)
    if (maxWait && timeSinceLastUpdate < maxWait) {
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }

      maxWaitTimeoutRef.current = setTimeout(() => {
        setDebouncedData(data);
        lastUpdateRef.current = Date.now();

        // Clear debounce timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        maxWaitTimeoutRef.current = null;
      }, maxWait - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
      }
    };
  }, [data, delay, maxWait, leading]);

  return debouncedData;
}

/**
 * Throttle map data updates (max frequency)
 *
 * @param data - Data to throttle
 * @param delay - Throttle delay in milliseconds (default: 500)
 * @returns Throttled data
 */
export function useThrottledMapData<T>(data: T, delay: number = 500): T {
  const [throttledData, setThrottledData] = useState<T>(data);
  const lastUpdateRef = useRef<number>(0);
  const pendingDataRef = useRef<T>(data);

  useEffect(() => {
    pendingDataRef.current = data;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= delay) {
      // Update immediately
      setThrottledData(data);
      lastUpdateRef.current = now;
    } else {
      // Schedule update after remaining time
      const remainingTime = delay - timeSinceLastUpdate;
      const timeout = setTimeout(() => {
        setThrottledData(pendingDataRef.current);
        lastUpdateRef.current = Date.now();
      }, remainingTime);

      return () => clearTimeout(timeout);
    }
  }, [data, delay]);

  return throttledData;
}

/**
 * Batch map data updates (accumulate changes)
 *
 * @param data - Data to batch
 * @param delay - Batch delay in milliseconds (default: 200)
 * @returns Batched data
 */
export function useBatchedMapData<T extends any[]>(
  data: T,
  delay: number = 200
): T {
  const [batchedData, setBatchedData] = useState<T>(data);
  const accumulatorRef = useRef<T>(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Accumulate changes
    accumulatorRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new batch timeout
    timeoutRef.current = setTimeout(() => {
      setBatchedData(accumulatorRef.current);
      timeoutRef.current = null;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay]);

  return batchedData;
}

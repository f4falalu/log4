/**
 * PerformanceHeatmapLayer Component
 *
 * Forensics mode heatmap showing performance metrics across geography
 * Visualizes delivery success rates, delays, exceptions by area
 *
 * Features:
 * - Heatmap overlay (delivery success, delay hotspots, exception density)
 * - Color intensity based on metric severity
 * - Time-based filtering
 * - Zone-based aggregation
 * - Interactive tooltips
 *
 * Metrics Visualized:
 * - On-time delivery rate (green = good, red = poor)
 * - Average delay duration
 * - Exception frequency
 * - Trade-Off density
 */

import { useEffect, useState } from 'react';
import { MapUtils } from '@/lib/mapUtils';
import L from 'leaflet';

interface PerformanceHeatmapLayerProps {
  map: L.Map | null;
  active: boolean;
  metric: 'on_time' | 'delays' | 'exceptions' | 'tradeoffs';
  timeRange?: { start: Date; end: Date };
}

export function PerformanceHeatmapLayer({
  map,
  active,
  metric,
  timeRange,
}: PerformanceHeatmapLayerProps) {
  const [heatmapLayer, setHeatmapLayer] = useState<L.Layer | null>(null);

  useEffect(() => {
    // Early exit with MapUtils check
    if (!MapUtils.isMapReady(map) || !active) {
      if (heatmapLayer && map) {
        try {
          map.removeLayer(heatmapLayer);
        } catch (e) {
          console.warn('[PerformanceHeatmapLayer] Failed to remove layer:', e);
        }
        setHeatmapLayer(null);
      }
      return;
    }

    // Clear existing layer before creating new one
    if (heatmapLayer) {
      try {
        map.removeLayer(heatmapLayer);
      } catch (e) {
        console.warn('[PerformanceHeatmapLayer] Failed to remove existing layer:', e);
      }
    }

    // Create heatmap layer
    try {
      const mockHeatmapData = generateMockHeatmapData(metric);
      const gradient = getGradientForMetric(metric);
      const layerGroup = L.layerGroup();

      mockHeatmapData.forEach(([lat, lng, intensity]) => {
        const color = getColorFromGradient(gradient, intensity);
        L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.4,
        })
          .bindPopup(`${metric.replace(/_/g, ' ')}: ${(intensity * 100).toFixed(0)}%`)
          .addTo(layerGroup);
      });

      layerGroup.addTo(map);
      setHeatmapLayer(layerGroup);
    } catch (e) {
      console.error('[PerformanceHeatmapLayer] Failed to create heatmap:', e);
    }

    return () => {
      if (heatmapLayer && map) {
        try {
          map.removeLayer(heatmapLayer);
        } catch {}
      }
    };
  }, [map, active, metric, timeRange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatmapLayer && map) {
        try {
          map.removeLayer(heatmapLayer);
        } catch {}
        setHeatmapLayer(null);
      }
    };
  }, []);

  return null; // This is a pure layer component
}

/**
 * Generate mock heatmap data for demonstration
 * Format: [latitude, longitude, intensity]
 */
function generateMockHeatmapData(
  metric: 'on_time' | 'delays' | 'exceptions' | 'tradeoffs'
): Array<[number, number, number]> {
  // Nigeria major cities as hotspots
  const hotspots = [
    { lat: 9.082, lng: 8.6753, name: 'Abuja' }, // Abuja
    { lat: 6.5244, lng: 3.3792, name: 'Lagos' }, // Lagos
    { lat: 7.3775, lng: 3.947, name: 'Ibadan' }, // Ibadan
    { lat: 11.9974, lng: 8.5151, name: 'Kano' }, // Kano
    { lat: 5.3203, lng: 7.2719, name: 'Enugu' }, // Enugu
  ];

  const data: Array<[number, number, number]> = [];

  hotspots.forEach((hotspot) => {
    // Generate cluster of points around each hotspot
    for (let i = 0; i < 20; i++) {
      const latOffset = (Math.random() - 0.5) * 0.5;
      const lngOffset = (Math.random() - 0.5) * 0.5;
      const intensity = getIntensityForMetric(metric, hotspot.name);

      data.push([hotspot.lat + latOffset, hotspot.lng + lngOffset, intensity]);
    }
  });

  return data;
}

/**
 * Get intensity value based on metric type and location
 */
function getIntensityForMetric(
  metric: 'on_time' | 'delays' | 'exceptions' | 'tradeoffs',
  location: string
): number {
  // Mock logic: Lagos has more issues, Abuja is better
  const baseIntensity = location === 'Lagos' ? 0.8 : location === 'Abuja' ? 0.3 : 0.5;

  switch (metric) {
    case 'on_time':
      return 1 - baseIntensity; // Inverse for on-time (lower = worse)
    case 'delays':
      return baseIntensity;
    case 'exceptions':
      return baseIntensity * 0.7;
    case 'tradeoffs':
      return baseIntensity * 0.5;
    default:
      return 0.5;
  }
}

/**
 * Get color from gradient based on intensity value
 */
function getColorFromGradient(gradient: Record<number, string>, intensity: number): string {
  const stops = Object.keys(gradient)
    .map(Number)
    .sort((a, b) => a - b);

  // Find the two stops to interpolate between
  for (let i = 0; i < stops.length - 1; i++) {
    if (intensity >= stops[i] && intensity <= stops[i + 1]) {
      // For simplicity, return the lower stop's color
      // (full interpolation would require color parsing and mixing)
      return gradient[stops[i]];
    }
  }

  // Return the last color if intensity is at max
  return gradient[stops[stops.length - 1]];
}

/**
 * Get color gradient configuration for each metric
 */
function getGradientForMetric(
  metric: 'on_time' | 'delays' | 'exceptions' | 'tradeoffs'
): Record<number, string> {
  switch (metric) {
    case 'on_time':
      // Green (good) to Red (poor)
      return {
        0.0: '#10b981', // Green
        0.3: '#84cc16', // Light green
        0.5: '#eab308', // Yellow
        0.7: '#f97316', // Orange
        1.0: '#ef4444', // Red
      };

    case 'delays':
      // Blue (low delays) to Red (high delays)
      return {
        0.0: '#3b82f6', // Blue
        0.3: '#8b5cf6', // Purple
        0.5: '#ec4899', // Pink
        0.7: '#f97316', // Orange
        1.0: '#ef4444', // Red
      };

    case 'exceptions':
      // Yellow to Red (exception hotspots)
      return {
        0.0: '#fef3c7', // Light yellow
        0.3: '#fcd34d', // Yellow
        0.5: '#fb923c', // Orange
        0.7: '#f87171', // Light red
        1.0: '#dc2626', // Dark red
      };

    case 'tradeoffs':
      // Purple gradient (Trade-Off density)
      return {
        0.0: '#e9d5ff', // Light purple
        0.3: '#c084fc', // Purple
        0.5: '#a855f7', // Medium purple
        0.7: '#9333ea', // Dark purple
        1.0: '#7e22ce', // Darkest purple
      };

    default:
      return {
        0.0: '#3b82f6',
        1.0: '#ef4444',
      };
  }
}

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { GPSPoint } from '@/hooks/admin/useSessions';

interface SessionGPSMapProps {
  gpsPoints: GPSPoint[];
  startLocation?: { lat: number; lng: number } | null;
  endLocation?: { lat: number; lng: number } | null;
}

export function SessionGPSMap({ gpsPoints, startLocation, endLocation }: SessionGPSMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center (Lagos, Nigeria)
    const defaultCenter: [number, number] = [3.3792, 6.5244];

    // Calculate center from GPS points
    let center = defaultCenter;
    if (gpsPoints.length > 0) {
      const lats = gpsPoints.map((p) => p.latitude);
      const lngs = gpsPoints.map((p) => p.longitude);
      center = [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
      ];
    } else if (startLocation) {
      center = [startLocation.lng, startLocation.lat];
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add GPS trail
      if (gpsPoints.length > 1) {
        const coordinates = gpsPoints.map((p) => [p.longitude, p.latitude]);

        map.current.addSource('gps-trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.current.addLayer({
          id: 'gps-trail-line',
          type: 'line',
          source: 'gps-trail',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.8,
          },
        });

        // Fit bounds to trail
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

      // Add start marker
      if (startLocation || (gpsPoints.length > 0)) {
        const start = startLocation || { lat: gpsPoints[0].latitude, lng: gpsPoints[0].longitude };
        new maplibregl.Marker({ color: '#22c55e' })
          .setLngLat([start.lng, start.lat])
          .setPopup(new maplibregl.Popup().setHTML('<strong>Start</strong>'))
          .addTo(map.current);
      }

      // Add end marker
      if (endLocation || (gpsPoints.length > 1)) {
        const end = endLocation || {
          lat: gpsPoints[gpsPoints.length - 1].latitude,
          lng: gpsPoints[gpsPoints.length - 1].longitude,
        };
        new maplibregl.Marker({ color: '#ef4444' })
          .setLngLat([end.lng, end.lat])
          .setPopup(new maplibregl.Popup().setHTML('<strong>End</strong>'))
          .addTo(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [gpsPoints, startLocation, endLocation]);

  return (
    <div ref={mapContainer} className="w-full h-[400px] rounded-lg border" />
  );
}

import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { getMapLibreStyle } from '@/lib/mapConfig';

export interface DriverMarker {
  driver_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  heading?: number;
  speed_mps?: number;
  battery_level?: number;
  vehicle_plate?: string;
  last_update?: string;
}

export interface DispatcherMapProps {
  drivers: DriverMarker[];
  selectedDriverId?: string | null;
  onDriverClick?: (driverId: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

/**
 * Dispatcher Map Component
 * Real-time driver tracking map using MapLibre GL
 */
export function DispatcherMap({
  drivers = [],
  selectedDriverId = null,
  onDriverClick,
  center = [8.6753, 9.082], // Nigeria center
  zoom = 6,
  height = 'h-full',
}: DispatcherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const { theme } = useTheme();

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapLibreStyle(theme === 'dark' ? 'dark' : 'light'),
      center: center,
      zoom: zoom,
      attributionControl: false,
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add attribution
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update basemap style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;

    const newStyle = getMapLibreStyle(theme === 'dark' ? 'dark' : 'light');
    mapRef.current.setStyle(newStyle);
  }, [theme]);

  // Update driver markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove markers that are no longer in the list
    const currentDriverIds = new Set(drivers.map(d => d.driver_id));
    markersRef.current.forEach((marker, driverId) => {
      if (!currentDriverIds.has(driverId)) {
        marker.remove();
        markersRef.current.delete(driverId);
      }
    });

    // Add or update markers
    drivers.forEach((driver) => {
      if (!driver.lat || !driver.lng) return;

      let marker = markersRef.current.get(driver.driver_id);

      if (!marker) {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'driver-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.2s';

        // Create marker icon
        const isSelected = driver.driver_id === selectedDriverId;
        const batteryColor = driver.battery_level
          ? driver.battery_level > 50
            ? '#10b981'
            : driver.battery_level > 20
            ? '#f59e0b'
            : '#ef4444'
          : '#6b7280';

        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${isSelected ? '#3b82f6' : batteryColor}" stroke="white" stroke-width="2"/>
            <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;

        // Hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        // Click handler
        el.addEventListener('click', () => {
          if (onDriverClick) {
            onDriverClick(driver.driver_id);
          }
        });

        marker = new maplibregl.Marker({ element: el, rotation: driver.heading || 0 })
          .setLngLat([driver.lng, driver.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(`
              <div style="font-family: system-ui; font-size: 12px;">
                <strong>${driver.driver_name}</strong><br/>
                ${driver.vehicle_plate ? `Vehicle: ${driver.vehicle_plate}<br/>` : ''}
                ${driver.speed_mps ? `Speed: ${Math.round(driver.speed_mps * 3.6)} km/h<br/>` : ''}
                ${driver.battery_level ? `Battery: ${driver.battery_level}%<br/>` : ''}
                ${driver.last_update ? `Updated: ${new Date(driver.last_update).toLocaleTimeString()}` : ''}
              </div>
            `)
          )
          .addTo(map);

        markersRef.current.set(driver.driver_id, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([driver.lng, driver.lat]);
        if (driver.heading) {
          marker.setRotation(driver.heading);
        }

        // Update marker appearance if selection changed
        const el = marker.getElement();
        const isSelected = driver.driver_id === selectedDriverId;
        const batteryColor = driver.battery_level
          ? driver.battery_level > 50
            ? '#10b981'
            : driver.battery_level > 20
            ? '#f59e0b'
            : '#ef4444'
          : '#6b7280';

        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${isSelected ? '#3b82f6' : batteryColor}" stroke="white" stroke-width="2"/>
            <path d="M16 10 L16 22 M10 16 L22 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;

        // Update popup
        marker.setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family: system-ui; font-size: 12px;">
              <strong>${driver.driver_name}</strong><br/>
              ${driver.vehicle_plate ? `Vehicle: ${driver.vehicle_plate}<br/>` : ''}
              ${driver.speed_mps ? `Speed: ${Math.round(driver.speed_mps * 3.6)} km/h<br/>` : ''}
              ${driver.battery_level ? `Battery: ${driver.battery_level}%<br/>` : ''}
              ${driver.last_update ? `Updated: ${new Date(driver.last_update).toLocaleTimeString()}` : ''}
            </div>
          `)
        );
      }
    });

    // Auto-fit bounds if drivers present
    if (drivers.length > 0 && map.isStyleLoaded()) {
      const bounds = new maplibregl.LngLatBounds();
      drivers.forEach((driver) => {
        if (driver.lat && driver.lng) {
          bounds.extend([driver.lng, driver.lat]);
        }
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 14,
          duration: 1000,
        });
      }
    }
  }, [drivers, selectedDriverId, onDriverClick]);

  // Fly to selected driver
  useEffect(() => {
    if (!mapRef.current || !selectedDriverId) return;

    const driver = drivers.find(d => d.driver_id === selectedDriverId);
    if (driver && driver.lat && driver.lng) {
      mapRef.current.flyTo({
        center: [driver.lng, driver.lat],
        zoom: 14,
        duration: 1000,
      });

      // Show popup
      const marker = markersRef.current.get(selectedDriverId);
      if (marker) {
        marker.togglePopup();
      }
    }
  }, [selectedDriverId, drivers]);

  return (
    <div ref={containerRef} className={height} />
  );
}

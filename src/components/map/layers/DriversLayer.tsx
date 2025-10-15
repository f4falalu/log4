import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Driver, DeliveryBatch } from '@/types';
import { MapIcons } from '@/lib/mapIcons';

interface DriversLayerProps {
  map: L.Map | null;
  drivers: Driver[];
  batches?: DeliveryBatch[];
  onDriverClick?: (id: string) => void;
}

export function DriversLayer({ 
  map, 
  drivers, 
  batches = [],
  onDriverClick 
}: DriversLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Initialize layer group if needed
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    // Clear existing markers and lines
    layerRef.current.clearLayers();
    markersRef.current = [];
    linesRef.current = [];

    // Add driver markers
    drivers.forEach(driver => {
      if (!layerRef.current || !driver.currentLocation) return;

      // Check if driver is assigned to an in-progress batch
      const driverBatch = batches.find(b => b.driverId === driver.id && b.status === 'in-progress');
      const isActive = !!driverBatch;

      // Get driver initials
      const initials = driver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      const marker = L.marker([driver.currentLocation.lat, driver.currentLocation.lng], {
        icon: MapIcons.driver(driver.status, initials, isActive)
      });

      // Create popup content
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">👤 ${driver.name}</div>
            <div style="display: flex; gap: 4px;">
              <span style="display: inline-block; padding: 2px 8px; background-color: ${
                driver.status === 'available' ? '#22c55e' : 
                driver.status === 'busy' ? '#f59e0b' : '#64748b'
              }; color: white; border-radius: 4px; font-size: 12px;">
                ${driver.status.toUpperCase()}
              </span>
              <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px;">
                ${driver.licenseType.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📞 ${driver.phone}</div>
            <div style="margin-bottom: 4px;">🕒 Shift: ${driver.shiftStart} - ${driver.shiftEnd}</div>
            ${driverBatch ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 500; color: #22c55e;">🚛 Active Delivery</div>
              <div>${driverBatch.name}</div>
            </div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });

      // Add click handler if provided
      if (onDriverClick) {
        marker.on('click', () => onDriverClick(driver.id));
      }

      marker.addTo(layerRef.current);
      markersRef.current.push(marker);

      // If driver is active, draw dashed line to next destination
      if (isActive && driverBatch) {
        const nextFacility = driverBatch.facilities[0]; // Simplified: first facility
        if (nextFacility) {
          const dashedLine = L.polyline(
            [[driver.currentLocation.lat, driver.currentLocation.lng], [nextFacility.lat, nextFacility.lng]],
            {
              color: '#22c55e',
              weight: 2,
              opacity: 0.6,
              dashArray: '5, 10'
            }
          );
          dashedLine.addTo(layerRef.current);
          linesRef.current.push(dashedLine);
        }
      }
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, drivers, batches, onDriverClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, []);

  return null;
}

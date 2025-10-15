import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Facility } from '@/types';
import { MapIcons } from '@/lib/mapIcons';
import { MapUtils } from '@/lib/mapUtils';

interface FacilitiesLayerProps {
  map: L.Map | null;
  facilities: Facility[];
  selectedIds?: string[];
  onFacilityClick?: (id: string) => void;
}

export function FacilitiesLayer({ 
  map, 
  facilities, 
  selectedIds = [], 
  onFacilityClick 
}: FacilitiesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!MapUtils.isMapReady(map)) return;

    // Initialize layer group if needed
    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[FacilitiesLayer] Failed to initialize layer:', e);
        return;
      }
    }

    // Clear existing markers
    layerRef.current.clearLayers();
    markersRef.current = [];

    // Add facility markers
    facilities.forEach(facility => {
      if (!layerRef.current) return;

      // Validate coordinates
      const hasValidCoords = facility.lat && facility.lng && 
        !isNaN(facility.lat) && !isNaN(facility.lng) &&
        facility.lat >= -90 && facility.lat <= 90 &&
        facility.lng >= -180 && facility.lng <= 180;

      if (!hasValidCoords) {
        console.warn(`Invalid coordinates for facility ${facility.id}:`, facility.lat, facility.lng);
        return;
      }

      const isSelected = selectedIds.includes(facility.id);
      const marker = L.marker([facility.lat, facility.lng], {
        icon: MapIcons.facility(isSelected, facility.type)
      });

      // Create popup content
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${facility.name}</div>
            <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px;">
              ${facility.type}
            </span>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${facility.address}</div>
            ${facility.phone ? `<div style="margin-bottom: 4px;">📞 ${facility.phone}</div>` : ''}
            ${facility.contactPerson ? `<div style="margin-bottom: 4px;">👤 ${facility.contactPerson}</div>` : ''}
            ${facility.operatingHours ? `<div style="margin-bottom: 4px;">🕒 ${facility.operatingHours}</div>` : ''}
            ${facility.capacity ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-weight: 500;">Capacity: ${facility.capacity}</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });

      // Add click handler if provided
      if (onFacilityClick) {
        marker.on('click', () => onFacilityClick(facility.id));
      }

      try {
        marker.addTo(layerRef.current);
        markersRef.current.push(marker);
      } catch (e) {
        console.error('[FacilitiesLayer] Failed to add marker:', e);
      }
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, facilities, selectedIds, onFacilityClick]);

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

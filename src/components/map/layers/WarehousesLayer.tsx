import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Warehouse } from '@/types';
import { MapIcons } from '@/lib/mapIcons';

interface WarehousesLayerProps {
  map: L.Map | null;
  warehouses: Warehouse[];
  selectedIds?: string[];
  onWarehouseClick?: (id: string) => void;
}

export function WarehousesLayer({ 
  map, 
  warehouses, 
  selectedIds = [], 
  onWarehouseClick 
}: WarehousesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Initialize layer group if needed
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    // Clear existing markers
    layerRef.current.clearLayers();
    markersRef.current = [];

    // Add warehouse markers
    warehouses.forEach(warehouse => {
      if (!layerRef.current) return;

      const isSelected = selectedIds.includes(warehouse.id);
      const marker = L.marker([warehouse.lat, warehouse.lng], {
        icon: MapIcons.warehouse(isSelected)
      });

      // Create popup content
      const popupContent = `
        <div style="padding: 8px;">
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">🏭 ${warehouse.name}</div>
            <span style="display: inline-block; padding: 2px 8px; background-color: hsl(195 100% 28%); color: white; border-radius: 4px; font-size: 12px;">
              ${warehouse.type.toUpperCase()} WAREHOUSE
            </span>
          </div>
          
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">📍 ${warehouse.address}</div>
            <div style="margin-bottom: 4px;">📦 Capacity: ${warehouse.capacity.toLocaleString()}</div>
            <div style="margin-bottom: 4px;">🕒 ${warehouse.operatingHours}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });

      // Add click handler if provided
      if (onWarehouseClick) {
        marker.on('click', () => onWarehouseClick(warehouse.id));
      }

      marker.addTo(layerRef.current);
      markersRef.current.push(marker);
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, warehouses, selectedIds, onWarehouseClick]);

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

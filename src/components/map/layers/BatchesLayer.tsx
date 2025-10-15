import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { DeliveryBatch, Warehouse } from '@/types';

interface BatchesLayerProps {
  map: L.Map | null;
  batches: DeliveryBatch[];
  warehouses: Warehouse[];
  selectedBatchId?: string | null;
  onBatchClick?: (id: string) => void;
}

export function BatchesLayer({ 
  map, 
  batches, 
  warehouses, 
  selectedBatchId = null,
  onBatchClick 
}: BatchesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Initialize layer group if needed
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    // Clear existing lines
    layerRef.current.clearLayers();
    linesRef.current = [];

    // Add batch route lines with focus mode styling
    batches.forEach((batch) => {
      if (!layerRef.current || batch.facilities.length === 0 || batch.status === 'cancelled') return;

      const warehouse = warehouses.find(w => w.id === batch.warehouseId);
      if (!warehouse) return;

      const isSelected = selectedBatchId === batch.id;
      const hasSelection = selectedBatchId !== null;

      // Use optimized route if available, otherwise create simple route
      let routeCoords: [number, number][];
      if (batch.optimizedRoute && batch.optimizedRoute.length > 0) {
        routeCoords = batch.optimizedRoute;
      } else {
        routeCoords = [[warehouse.lat, warehouse.lng]];
        batch.facilities.forEach(facility => {
          routeCoords.push([facility.lat, facility.lng]);
        });
      }

      // Different styling based on batch status and selection state
      let color = '#8b5cf6'; // default purple
      let weight = 4;
      let dashArray = undefined;
      let opacity = 0.9;

      switch (batch.status) {
        case 'planned':
          color = '#6b7280'; // gray
          dashArray = '15, 15';
          break;
        case 'assigned':
          color = '#f59e0b'; // amber
          dashArray = '10, 5';
          break;
        case 'in-progress':
          color = '#10b981'; // emerald
          weight = 5;
          break;
        case 'completed':
          color = '#059669'; // green
          weight = 3;
          dashArray = '5, 5';
          break;
      }

      // Apply selection styling
      if (hasSelection) {
        if (isSelected) {
          weight = weight + 2;
          opacity = 1.0;
        } else {
          opacity = 0.3;
          weight = weight - 1;
        }
      }

      const batchPolyline = L.polyline(routeCoords, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray
      });

      // Add popup with batch info
      const popupContent = `
        <div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">📦 ${batch.name}</div>
          <div style="font-size: 14px; color: #64748b;">
            <div style="margin-bottom: 4px;">Status: <span style="color: ${color}; font-weight: 500;">${batch.status.toUpperCase()}</span></div>
            <div style="margin-bottom: 4px;">Stops: ${batch.facilities.length}</div>
            ${batch.driverId ? `<div style="margin-bottom: 4px;">Driver Assigned</div>` : ''}
          </div>
        </div>
      `;

      batchPolyline.bindPopup(popupContent, { maxWidth: 250 });

      // Add click handler if provided
      if (onBatchClick) {
        batchPolyline.on('click', () => onBatchClick(batch.id));
      }

      batchPolyline.addTo(layerRef.current);
      linesRef.current.push(batchPolyline);
    });

    // Auto-zoom to selected batch if exists
    if (selectedBatchId && map) {
      const selectedBatch = batches.find(b => b.id === selectedBatchId);
      if (selectedBatch && selectedBatch.facilities.length > 0) {
        const warehouse = warehouses.find(w => w.id === selectedBatch.warehouseId);
        if (warehouse) {
          try {
            const bounds = L.latLngBounds([
              [warehouse.lat, warehouse.lng],
              ...selectedBatch.facilities.map(f => [f.lat, f.lng] as [number, number])
            ]);
            if (bounds.isValid()) {
              requestAnimationFrame(() => {
                map.fitBounds(bounds.pad(0.2));
              });
            }
          } catch (error) {
            console.error('[BatchesLayer] Error fitting bounds to selected batch:', error);
          }
        }
      }
    }

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, batches, warehouses, selectedBatchId, onBatchClick]);

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

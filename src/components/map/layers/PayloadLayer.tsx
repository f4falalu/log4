import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapUtils } from '@/lib/mapUtils';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehiclePayload } from '@/hooks/useVehiclePayload';

interface PayloadLayerProps {
  map: L.Map | null;
  visible: boolean;
}

/**
 * PayloadLayer - Visualizes payload distribution across vehicles
 * Shows capacity utilization as colored circles around vehicle positions
 */
export function PayloadLayer({ map, visible }: PayloadLayerProps) {
  const { data: vehicles = [] } = useVehicles();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());

  useEffect(() => {
    if (!MapUtils.isMapReady(map) || !visible) {
      // Clear layer if not visible
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
      return;
    }

    // Initialize layer group
    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[PayloadLayer] Failed to initialize layer:', e);
        return;
      }
    }

    // Clear existing circles
    layerRef.current.clearLayers();
    circlesRef.current.clear();

    // Render payload visualization for vehicles with location
    vehicles.forEach((vehicle) => {
      if (!layerRef.current) return;
      
      // Skip if vehicle has no current location
      // In a real implementation, you'd get this from driver or vehicle tracking
      // For now, we'll skip vehicles without payload data
      
      try {
        // Calculate utilization percentage
        const utilizationPct = calculateUtilization(vehicle);
        
        if (utilizationPct === null) return; // Skip if no payload data

        // Determine circle color based on utilization
        const circleColor = getUtilizationColor(utilizationPct);
        
        // Determine circle radius based on capacity (larger vehicles = larger circles)
        const baseRadius = 100; // meters
        const capacityFactor = Math.min(vehicle.capacity / 50, 3); // Cap at 3x
        const radius = baseRadius * capacityFactor;

        // For demo purposes, place circles at warehouse locations
        // In production, this would use real-time vehicle GPS coordinates
        // This is a placeholder until vehicle location tracking is integrated
        
        // Create info label
        const label = L.divIcon({
          html: `
            <div class="bg-background/90 backdrop-blur-sm border rounded-lg px-2 py-1 shadow-lg text-xs">
              <div class="font-bold">${vehicle.model}</div>
              <div class="text-muted-foreground">${utilizationPct.toFixed(0)}% utilized</div>
            </div>
          `,
          className: 'payload-label',
          iconSize: [100, 40],
          iconAnchor: [50, 20],
        });

        // Note: Actual rendering would happen here with real coordinates
        // circlesRef.current.set(vehicle.id, circle);
        
      } catch (e) {
        console.error(`[PayloadLayer] Failed to render payload for vehicle ${vehicle.id}:`, e);
      }
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, vehicles, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
        layerRef.current = null;
      }
      circlesRef.current.clear();
    };
  }, []);

  return null;
}

/**
 * Calculate vehicle payload utilization percentage
 */
function calculateUtilization(vehicle: any): number | null {
  // This would integrate with actual payload tracking
  // For now, return null to indicate no data
  // In production, this would query useVehiclePayload(vehicle.id)
  return null;
}

/**
 * Get color based on utilization percentage
 * Green (low) → Yellow (medium) → Red (high)
 */
function getUtilizationColor(utilizationPct: number): string {
  if (utilizationPct < 50) {
    return 'hsl(142, 76%, 36%)'; // green
  } else if (utilizationPct < 80) {
    return 'hsl(48, 96%, 53%)'; // yellow
  } else {
    return 'hsl(0, 84%, 60%)'; // red
  }
}

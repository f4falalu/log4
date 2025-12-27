/**
 * TradeOffRoutesLayer Component
 *
 * Renders Trade-Off routes with DOTTED LINES (MANDATORY)
 * Displays routes from source vehicle to handover point,
 * and from handover point to each receiving vehicle
 *
 * Visual Style:
 * - Dotted/dashed lines (NOT solid)
 * - Different color from regular routes
 * - Handover point marker
 * - Item allocation labels
 *
 * Critical: Dotted lines are MANDATORY to distinguish Trade-Off routes
 * from regular dispatch routes
 */

import { useEffect } from 'react';
import L from 'leaflet';
import { useTradeOff } from '@/hooks/useTradeOff';

interface TradeOffRoutesLayerProps {
  map: L.Map | null;
}

export function TradeOffRoutesLayer({ map }: TradeOffRoutesLayerProps) {
  const {
    state,
    sourceVehicleId,
    receivingVehicleIds,
    handoverPoint,
    items,
  } = useTradeOff();

  useEffect(() => {
    // Don't render anything if there's no handover point
    if (!handoverPoint) return;
    if (!map) return;

    // Layer group for Trade-Off routes
    const tradeOffLayerGroup = L.layerGroup().addTo(map);

    // ========================================================================
    // STYLE: Dotted lines (MANDATORY)
    // ========================================================================
    const tradeOffLineStyle = {
      color: '#f59e0b', // Amber color for Trade-Off
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 10', // MANDATORY: Dotted/dashed pattern
      lineCap: 'round' as const,
    };

    const handoverPointStyle = {
      radius: 12,
      fillColor: '#f59e0b',
      color: '#ffffff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.8,
    };

    // ========================================================================
    // HANDOVER POINT MARKER
    // ========================================================================
    const handoverMarker = L.circleMarker(
      [handoverPoint.lat, handoverPoint.lng],
      handoverPointStyle
    )
      .bindPopup(
        `
        <div class="p-2">
          <p class="font-semibold text-sm mb-1">Handover Point</p>
          <p class="text-xs text-gray-600">
            Lat: ${handoverPoint.lat.toFixed(6)}<br/>
            Lng: ${handoverPoint.lng.toFixed(6)}
          </p>
        </div>
      `,
        { className: 'tradeoff-popup' }
      )
      .addTo(tradeOffLayerGroup);

    // ========================================================================
    // SOURCE TO HANDOVER ROUTE (Dotted line)
    // ========================================================================
    // TODO: Get actual source vehicle location from vehicle state
    // For now, using placeholder coordinates
    const sourceLocation = { lat: handoverPoint.lat + 0.01, lng: handoverPoint.lng - 0.01 };

    const sourceToHandoverLine = L.polyline(
      [
        [sourceLocation.lat, sourceLocation.lng],
        [handoverPoint.lat, handoverPoint.lng],
      ],
      tradeOffLineStyle
    )
      .bindPopup(
        `
        <div class="p-2">
          <p class="font-semibold text-sm mb-1">Trade-Off Route</p>
          <p class="text-xs text-gray-600">
            Source: ${sourceVehicleId || 'Unknown'}<br/>
            Direction: To Handover Point
          </p>
        </div>
      `,
        { className: 'tradeoff-popup' }
      )
      .addTo(tradeOffLayerGroup);

    // ========================================================================
    // HANDOVER TO RECEIVERS ROUTES (Dotted lines)
    // ========================================================================
    receivingVehicleIds.forEach((vehicleId, index) => {
      // TODO: Get actual receiver vehicle locations from vehicle state
      // For now, using placeholder coordinates
      const receiverLocation = {
        lat: handoverPoint.lat - 0.01,
        lng: handoverPoint.lng + 0.01 * (index + 1),
      };

      const handoverToReceiverLine = L.polyline(
        [
          [handoverPoint.lat, handoverPoint.lng],
          [receiverLocation.lat, receiverLocation.lng],
        ],
        tradeOffLineStyle
      )
        .bindPopup(
          `
          <div class="p-2">
            <p class="font-semibold text-sm mb-1">Trade-Off Route</p>
            <p class="text-xs text-gray-600">
              Receiver: ${vehicleId}<br/>
              Direction: From Handover Point
            </p>
            ${
              items.length > 0
                ? `
              <div class="mt-2 border-t pt-2">
                <p class="text-xs font-semibold mb-1">Allocated Items:</p>
                ${items
                  .map((item) => {
                    const allocatedQty = item.allocatedQuantities[vehicleId] || 0;
                    if (allocatedQty === 0) return '';
                    return `
                    <p class="text-xs text-gray-600">
                      ${item.itemName}: ${allocatedQty} ${item.unit}
                    </p>
                  `;
                  })
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
        `,
          { className: 'tradeoff-popup' }
        )
        .addTo(tradeOffLayerGroup);
    });

    // ========================================================================
    // FIT BOUNDS (Optional: zoom to show all Trade-Off routes)
    // ========================================================================
    if (state === 'receivers_selected' || state === 'allocation_complete') {
      const allPoints = [
        [sourceLocation.lat, sourceLocation.lng],
        [handoverPoint.lat, handoverPoint.lng],
        ...receivingVehicleIds.map((_, index) => [
          handoverPoint.lat - 0.01,
          handoverPoint.lng + 0.01 * (index + 1),
        ]),
      ];

      const bounds = L.latLngBounds(allPoints as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================
    return () => {
      tradeOffLayerGroup.clearLayers();
      tradeOffLayerGroup.remove();
    };
  }, [map, state, sourceVehicleId, receivingVehicleIds, handoverPoint, items]);

  return null; // This is a layer component, no visual DOM elements
}

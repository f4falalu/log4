/**
 * TradeOffHistoryLayer Component
 *
 * Forensics mode layer showing historical Trade-Off events
 * Visualizes past Trade-Off decisions, routes, and outcomes
 *
 * Features:
 * - Historical Trade-Off route visualization
 * - Handover point markers
 * - Success/failure indicators
 * - Time-based filtering
 * - Click to view Trade-Off details
 *
 * Color Coding:
 * - Green: Successful Trade-Off (improved metrics)
 * - Yellow: Neutral Trade-Off (no significant change)
 * - Red: Failed/Rejected Trade-Off
 * - Purple: Handover points
 */

import { useEffect, useState } from 'react';
import L from 'leaflet';

interface TradeOffHistoryLayerProps {
  map: L.Map | null;
  active: boolean;
  timeRange?: { start: Date; end: Date };
  statusFilter?: 'all' | 'completed' | 'rejected' | 'cancelled';
}

interface HistoricalTradeOff {
  id: string;
  timestamp: Date;
  status: 'completed' | 'rejected' | 'cancelled';
  sourceVehicle: string;
  receivingVehicle: string;
  handoverPoint: L.LatLngExpression;
  sourceRoute: L.LatLngExpression[];
  receivingRoute: L.LatLngExpression[];
  itemsTransferred: number;
  outcome: {
    timeSaved: number; // minutes
    distanceSaved: number; // km
    successRate: number; // 0-100
  };
}

export function TradeOffHistoryLayer({
  map,
  active,
  timeRange,
  statusFilter = 'all',
}: TradeOffHistoryLayerProps) {
  const [layerGroup, setLayerGroup] = useState<L.LayerGroup | null>(null);
  const [tradeOffs, setTradeOffs] = useState<HistoricalTradeOff[]>([]);

  useEffect(() => {
    if (!map || !active) {
      // Clean up
      if (layerGroup) {
        layerGroup.clearLayers();
        layerGroup.remove();
        setLayerGroup(null);
      }
      setTradeOffs([]);
      return;
    }

    // Use Leaflet's whenReady to ensure map is fully initialized
    let cleanupFn: (() => void) | null = null;

    map.whenReady(() => {
      // Create layer group
      const lg = L.layerGroup().addTo(map);
      setLayerGroup(lg);

      // TODO: Fetch actual Trade-Off history from database
      // For now, using mock data
      const mockTradeOffs = generateMockTradeOffHistory();
      const filteredTradeOffs =
        statusFilter === 'all'
          ? mockTradeOffs
          : mockTradeOffs.filter((to) => to.status === statusFilter);

      setTradeOffs(filteredTradeOffs);

      // Render each Trade-Off
      filteredTradeOffs.forEach((tradeOff) => {
        renderTradeOff(lg, tradeOff);
      });

      // Store cleanup function
      cleanupFn = () => {
        lg.clearLayers();
        lg.remove();
      };
    });

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [map, active, timeRange, statusFilter]);

  return null; // This is a pure layer component
}

/**
 * Render a single historical Trade-Off on the map
 */
function renderTradeOff(layerGroup: L.LayerGroup, tradeOff: HistoricalTradeOff) {
  const color = getTradeOffColor(tradeOff);

  // Draw source vehicle route (dotted)
  L.polyline(tradeOff.sourceRoute, {
    color: color,
    weight: 3,
    opacity: 0.5,
    dashArray: '10, 5',
  })
    .bindPopup(
      `<strong>Source Route</strong><br/>Vehicle: ${tradeOff.sourceVehicle}<br/>Status: ${tradeOff.status}`
    )
    .addTo(layerGroup);

  // Draw receiving vehicle route (solid)
  L.polyline(tradeOff.receivingRoute, {
    color: color,
    weight: 3,
    opacity: 0.7,
  })
    .bindPopup(
      `<strong>Receiving Route</strong><br/>Vehicle: ${tradeOff.receivingVehicle}<br/>Status: ${tradeOff.status}`
    )
    .addTo(layerGroup);

  // Draw handover point
  const handoverIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  L.marker(tradeOff.handoverPoint, { icon: handoverIcon })
    .bindPopup(generateTradeOffPopup(tradeOff))
    .addTo(layerGroup);
}

/**
 * Get color based on Trade-Off status and outcome
 */
function getTradeOffColor(tradeOff: HistoricalTradeOff): string {
  if (tradeOff.status === 'rejected' || tradeOff.status === 'cancelled') {
    return '#ef4444'; // Red
  }

  if (tradeOff.status === 'completed') {
    // Color based on outcome success rate
    if (tradeOff.outcome.successRate >= 80) {
      return '#10b981'; // Green (successful)
    } else if (tradeOff.outcome.successRate >= 50) {
      return '#eab308'; // Yellow (neutral)
    } else {
      return '#f97316'; // Orange (poor outcome)
    }
  }

  return '#8b5cf6'; // Purple (default)
}

/**
 * Generate detailed popup content for a Trade-Off
 */
function generateTradeOffPopup(tradeOff: HistoricalTradeOff): string {
  const statusBadge = `<span style="
    background-color: ${getTradeOffColor(tradeOff)};
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  ">${tradeOff.status.toUpperCase()}</span>`;

  return `
    <div style="min-width: 200px; font-family: sans-serif;">
      <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
        <span>Trade-Off #${tradeOff.id.slice(0, 8)}</span>
        ${statusBadge}
      </div>

      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        ${tradeOff.timestamp.toLocaleDateString()} ${tradeOff.timestamp.toLocaleTimeString()}
      </div>

      <div style="font-size: 12px; line-height: 1.6;">
        <div><strong>From:</strong> ${tradeOff.sourceVehicle}</div>
        <div><strong>To:</strong> ${tradeOff.receivingVehicle}</div>
        <div><strong>Items:</strong> ${tradeOff.itemsTransferred}</div>
      </div>

      ${
        tradeOff.status === 'completed'
          ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Outcome</div>
          <div style="font-size: 11px; line-height: 1.6;">
            <div>⏱️ Time saved: ${tradeOff.outcome.timeSaved} min</div>
            <div>📏 Distance saved: ${tradeOff.outcome.distanceSaved.toFixed(1)} km</div>
            <div>✅ Success rate: ${tradeOff.outcome.successRate}%</div>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
}

/**
 * Generate mock Trade-Off history data
 */
function generateMockTradeOffHistory(): HistoricalTradeOff[] {
  const now = new Date();

  return [
    {
      id: 'to-001-abc',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'completed',
      sourceVehicle: 'TRK-001',
      receivingVehicle: 'TRK-005',
      handoverPoint: [9.082, 8.6753],
      sourceRoute: [
        [9.05, 8.65],
        [9.082, 8.6753],
      ],
      receivingRoute: [
        [9.082, 8.6753],
        [9.11, 8.7],
      ],
      itemsTransferred: 8,
      outcome: {
        timeSaved: 25,
        distanceSaved: 8.5,
        successRate: 95,
      },
    },
    {
      id: 'to-002-def',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: 'completed',
      sourceVehicle: 'TRK-003',
      receivingVehicle: 'TRK-007',
      handoverPoint: [6.5244, 3.3792], // Lagos
      sourceRoute: [
        [6.5, 3.35],
        [6.5244, 3.3792],
      ],
      receivingRoute: [
        [6.5244, 3.3792],
        [6.55, 3.4],
      ],
      itemsTransferred: 5,
      outcome: {
        timeSaved: 15,
        distanceSaved: 5.2,
        successRate: 78,
      },
    },
    {
      id: 'to-003-ghi',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      status: 'rejected',
      sourceVehicle: 'TRK-002',
      receivingVehicle: 'TRK-006',
      handoverPoint: [7.3775, 3.947], // Ibadan
      sourceRoute: [
        [7.35, 3.92],
        [7.3775, 3.947],
      ],
      receivingRoute: [
        [7.3775, 3.947],
        [7.4, 3.97],
      ],
      itemsTransferred: 0,
      outcome: {
        timeSaved: 0,
        distanceSaved: 0,
        successRate: 0,
      },
    },
  ];
}

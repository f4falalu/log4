/**
 * Operational Map Page
 *
 * Live execution control with Trade-Off workflow
 * Reuses 90% of existing TacticalMap.tsx logic
 *
 * Features:
 * - High-contrast status-colored objects
 * - Exception emphasis
 * - Live vehicle/driver tracking
 * - Trade-Off workflow (ONLY reassignment mechanism)
 * - Exception workflow triggers
 *
 * Forbidden:
 * - Zone editing
 * - Distance measurement tools
 * - Historical replay controls
 * - Route editing
 * - Generic reassignment
 * - Auto vehicle selection
 * - Route optimization
 */

import { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '@/hooks/useMapContext';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useRealtimeVehicles } from '@/hooks/useRealtimeVehicles';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { OperationalMap } from '@/map/modes/operational';
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';
import { DriverDrawer } from '@/components/map/drawers/DriverDrawer';
import { VehicleDrawer } from '@/components/map/drawers/VehicleDrawer';
import { BatchDrawer } from '@/components/map/drawers/BatchDrawer';

export default function OperationalMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

  // Set capability on mount
  useEffect(() => {
    setCapability('operational');
    setTimeHorizon('present');
  }, [setCapability, setTimeHorizon]);

  // Realtime subscriptions
  useRealtimeDrivers();
  useRealtimeVehicles();
  useRealtimeDeliveries();

  // UI state
  const [selectedDrawerType, setSelectedDrawerType] = useState<
    'driver' | 'vehicle' | 'batch' | null
  >(null);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);

  const handleEntityClick = useCallback(
    (type: 'driver' | 'vehicle' | 'batch', id: string) => {
      setSelectedDrawerType(type);
      setSelectedDrawerId(id);
    },
    []
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedDrawerType(null);
    setSelectedDrawerId(null);
  }, []);

  return (
    <div className="h-full relative" style={{ backgroundColor: 'var(--operational-bg-primary)' }}>
      {/* Mode Indicator */}
      <ModeIndicator mode="operational" />

      {/* Map Container */}
      <OperationalMap
        center={[8.6753, 9.082]}
        zoom={6}
        vehicles={vehicles}
        drivers={drivers}
        onVehicleClick={(id) => handleEntityClick('vehicle', id)}
        onDriverClick={(id) => handleEntityClick('driver', id)}
      />

      {/* Entity Drawers */}
      {selectedDrawerType === 'driver' && selectedDrawerId && (
        <DriverDrawer isOpen={true} driverId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}

      {selectedDrawerType === 'vehicle' && selectedDrawerId && (
        <VehicleDrawer isOpen={true} vehicleId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}

      {selectedDrawerType === 'batch' && selectedDrawerId && (
        <BatchDrawer isOpen={true} batchId={selectedDrawerId} onClose={handleCloseDrawer} />
      )}
    </div>
  );
}

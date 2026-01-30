/**
 * Live Map Page - Real-time tracking for drivers, vehicles, and deliveries
 */

import { useState, useCallback } from 'react';
import { LiveMapView } from '../components/LiveMapView';
import { LiveFilterPanel } from '../components/LiveFilterPanel';
import { EntityDetailPanel } from '../components/EntityDetailPanel';
import { useLiveMapStore } from '@/stores/liveMapStore';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import type { EntityType } from '@/types/live-map';

export default function LiveMapPage() {
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const selectedEntity = useLiveMapStore((s) => s.selectedEntity);
  const clearSelection = useLiveMapStore((s) => s.clearSelection);

  const { getDriver, getVehicle, getDelivery } = useLiveTracking();

  // Handle entity selection from map
  const handleEntitySelect = useCallback(
    (entityId: string, entityType: EntityType) => {
      setDetailPanelOpen(true);
    },
    []
  );

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setDetailPanelOpen(false);
    clearSelection();
  }, [clearSelection]);

  // Get selected entity data
  const selectedEntityData = selectedEntity
    ? selectedEntity.type === 'driver'
      ? getDriver(selectedEntity.id)
      : selectedEntity.type === 'vehicle'
        ? getVehicle(selectedEntity.id)
        : getDelivery(selectedEntity.id)
    : null;

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      <LiveFilterPanel />

      {/* Map container */}
      <div className="flex-1 relative">
        <LiveMapView onEntitySelect={handleEntitySelect} />
      </div>

      {/* Detail panel (slides in from right) */}
      {detailPanelOpen && selectedEntity && (
        <EntityDetailPanel
          entityId={selectedEntity.id}
          entityType={selectedEntity.type}
          entityData={selectedEntityData}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

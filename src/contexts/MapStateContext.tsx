import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface MapState {
  selectedFacilityId: string | null;
  selectedWarehouseId: string | null;
  selectedZoneId: string | null;
  selectedDriverId: string | null;
  selectedBatchId: string | null;
  mapCenter: [number, number] | null;
  mapZoom: number | null;
  visibleLayers: {
    facilities: boolean;
    warehouses: boolean;
    drivers: boolean;
    zones: boolean;
    batches: boolean;
  };
}

interface MapStateContextType {
  state: MapState;
  selectFacility: (id: string | null) => void;
  selectWarehouse: (id: string | null) => void;
  selectZone: (id: string | null) => void;
  selectDriver: (id: string | null) => void;
  selectBatch: (id: string | null) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  toggleLayer: (layer: keyof MapState['visibleLayers']) => void;
  clearSelection: () => void;
}

const MapStateContext = createContext<MapStateContextType | undefined>(undefined);

export function MapStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MapState>({
    selectedFacilityId: null,
    selectedWarehouseId: null,
    selectedZoneId: null,
    selectedDriverId: null,
    selectedBatchId: null,
    mapCenter: null,
    mapZoom: null,
    visibleLayers: {
      facilities: true,
      warehouses: true,
      drivers: true,
      zones: true,
      batches: true,
    },
  });

  const selectFacility = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedFacilityId: id }));
  }, []);

  const selectWarehouse = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedWarehouseId: id }));
  }, []);

  const selectZone = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedZoneId: id }));
  }, []);

  const selectDriver = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedDriverId: id }));
  }, []);

  const selectBatch = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedBatchId: id }));
  }, []);

  const setMapView = useCallback((center: [number, number], zoom: number) => {
    setState(prev => ({ ...prev, mapCenter: center, mapZoom: zoom }));
  }, []);

  const toggleLayer = useCallback((layer: keyof MapState['visibleLayers']) => {
    setState(prev => ({
      ...prev,
      visibleLayers: {
        ...prev.visibleLayers,
        [layer]: !prev.visibleLayers[layer],
      },
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFacilityId: null,
      selectedWarehouseId: null,
      selectedZoneId: null,
      selectedDriverId: null,
      selectedBatchId: null,
    }));
  }, []);

  return (
    <MapStateContext.Provider
      value={{
        state,
        selectFacility,
        selectWarehouse,
        selectZone,
        selectDriver,
        selectBatch,
        setMapView,
        toggleLayer,
        clearSelection,
      }}
    >
      {children}
    </MapStateContext.Provider>
  );
}

export function useMapState() {
  const context = useContext(MapStateContext);
  if (!context) {
    throw new Error('useMapState must be used within MapStateProvider');
  }
  return context;
}

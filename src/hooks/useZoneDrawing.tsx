import { useState, useCallback } from 'react';
import { ZoneDrawingState } from '@/types/zones';

export function useZoneDrawing() {
  const [drawingState, setDrawingState] = useState<ZoneDrawingState>({
    isDrawing: false,
    isEditing: false,
    selectedZoneId: null,
    temporaryGeometry: null,
  });

  const startDrawing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      isDrawing: true,
      isEditing: false,
      selectedZoneId: null,
      temporaryGeometry: null,
    }));
  }, []);

  const stopDrawing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      isDrawing: false,
      temporaryGeometry: null,
    }));
  }, []);

  const startEditing = useCallback((zoneId: string) => {
    setDrawingState(prev => ({
      ...prev,
      isEditing: true,
      isDrawing: false,
      selectedZoneId: zoneId,
    }));
  }, []);

  const stopEditing = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      isEditing: false,
      selectedZoneId: null,
    }));
  }, []);

  const selectZone = useCallback((zoneId: string | null) => {
    setDrawingState(prev => ({
      ...prev,
      selectedZoneId: zoneId,
    }));
  }, []);

  const setTemporaryGeometry = useCallback((geometry: GeoJSON.Feature<GeoJSON.Polygon> | null) => {
    setDrawingState(prev => ({
      ...prev,
      temporaryGeometry: geometry,
    }));
  }, []);

  return {
    drawingState,
    startDrawing,
    stopDrawing,
    startEditing,
    stopEditing,
    selectZone,
    setTemporaryGeometry,
  };
}

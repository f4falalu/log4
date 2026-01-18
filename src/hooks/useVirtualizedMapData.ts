import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useVirtualizedMapData(map: L.Map | null) {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const handleViewportChange = useCallback(() => {
    if (map) {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    handleViewportChange();

    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);

    return () => {
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [map, handleViewportChange]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['virtualizedMapData', bounds, zoom],
    queryFn: async () => {
      if (!bounds || !zoom) return null;

      const { data, error } = await supabase.functions.invoke('get-map-data-in-view', {
        body: {
          min_lat: bounds.getSouth(),
          min_lon: bounds.getWest(),
          max_lat: bounds.getNorth(),
          max_lon: bounds.getEast(),
          zoom,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!bounds && !!zoom,
    staleTime: 5000, // 5 seconds
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    error,
  };
}

import L from 'leaflet';

export const MapUtils = {
  /**
   * Fits map bounds to include all markers with optional padding
   */
  fitBoundsToMarkers: (map: L.Map, markers: L.Marker[], padding = 0.1) => {
    if (markers.length === 0) return;
    
    try {
      const group = new L.FeatureGroup(markers);
      const bounds = group.getBounds();
      
      if (bounds.isValid() && map.getSize()?.x > 0) {
        requestAnimationFrame(() => {
          try {
            map.fitBounds(bounds.pad(padding));
          } catch (e) {
            console.warn('[MapUtils] Could not fit bounds', e);
          }
        });
      }
    } catch (error) {
      console.error('[MapUtils] Error fitting bounds:', error);
    }
  },
  
  /**
   * Safely invalidates map size to prevent layout issues
   */
  safeInvalidateSize: (map: L.Map) => {
    requestAnimationFrame(() => {
      try {
        const container = map.getContainer();
        if ((container as any)?.isConnected) {
          map.invalidateSize();
        }
      } catch (e) {
        console.warn('[MapUtils] Could not invalidate size', e);
      }
    });
  },
  
  /**
   * Creates a reset view control for the map
   */
  createResetControl: (
    map: L.Map, 
    getMarkers: () => L.Marker[], 
    defaultView: { center: [number, number], zoom: number }
  ) => {
    return L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.innerHTML = '<a href="#" title="Reset View" style="width: 30px; height: 30px; line-height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px; text-decoration: none; background: white; color: #333;">↻</a>';
        container.onclick = (e) => {
          e.preventDefault();
          const markers = getMarkers();
          if (markers.length > 0) {
            MapUtils.fitBoundsToMarkers(map, markers);
          } else {
            map.setView(defaultView.center, defaultView.zoom);
          }
        };
        return container;
      }
    });
  },
};

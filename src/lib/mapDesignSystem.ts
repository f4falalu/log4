import { cn } from './utils';

export const MAP_DESIGN_SYSTEM = {
  // Layout configurations for different map modes
  layout: {
    fullscreen: 'h-screen w-full',
    embedded: 'h-[600px] w-full rounded-lg overflow-hidden',
    dashboard: 'h-[800px] w-full', // Taller for dashboard views
    
    // Toolbar positioning and styling
    toolbar: {
      position: 'absolute top-24 left-4 z-[1000]',
      buttonSize: 'h-10 w-10',
      gap: 'gap-2',
      container: 'flex flex-col bg-background/95 backdrop-blur-sm rounded-lg shadow-sm border p-2',
    },
    
    // Bottom data panel
    bottomPanel: {
      height: 'h-60',
      position: 'absolute bottom-0 left-0 right-0 z-[999]',
      container: 'bg-background/95 backdrop-blur-sm border-t shadow-sm',
    },
    
    // Side overlay panel
    sidePanel: {
      width: 'w-80 max-w-[90vw]',
      position: 'absolute right-4 top-4 bottom-4 z-[1000]',
      container: 'bg-background/95 backdrop-blur-sm border rounded-lg shadow-md',
    },
    
    // Floating card overlays
    overlay: {
      topRight: 'absolute top-4 right-4 z-[1000]',
      topLeft: 'absolute top-4 left-20 z-[1000]', // After toolbar
      bottomRight: 'absolute bottom-4 right-4 z-[1000]',
      bottomLeft: 'absolute bottom-4 left-4 z-[1000]',
      container: 'bg-card backdrop-blur-sm border rounded-lg shadow-md',
    },
  },
  
  // Visual styling tokens
  styling: {
    controlButton: cn(
      'rounded-lg bg-background/95 backdrop-blur-sm',
      'hover:bg-accent hover:text-accent-foreground',
      'transition-colors shadow-sm border'
    ),
    panel: cn(
      'bg-card backdrop-blur-sm',
      'border rounded-lg shadow-md'
    ),
    selectedMarker: 'ring-2 ring-primary ring-offset-2',
    floatingCard: cn(
      'bg-card border rounded-lg shadow-md',
      'backdrop-blur-sm'
    ),
  },
  
  // Interaction patterns
  interactions: {
    markerClick: 'click' as const,
    zoomOnSelect: true,
    autoFitBounds: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
  },
  
  // Standard widths for overlay components
  widths: {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[500px]',
    xl: 'w-[600px]',
  },
  
  // Component registry (for documentation)
  components: {
    core: 'LeafletMapCore',
    toolbar: 'MapToolsToolbar',
    bottomPanel: 'BottomDataPanel',
    searchPanel: 'SearchPanel',
    layersPanel: 'LayersPanel',
    legend: 'MapLegend',
    drawControls: 'DrawControls',
  },
} as const;

export type MapMode = 'fullscreen' | 'embedded' | 'dashboard';
export type OverlayPosition = 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';

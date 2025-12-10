/**
 * BIKO Tactical Map V3 Design System
 *
 * Consistent design tokens for the tactical map interface
 * Inspired by Tesla, Uber, and Palantir design systems
 */

/**
 * Spacing Scale
 * Use consistent spacing throughout all map components
 */
export const SPACING = {
  xs: '8px',    // 0.5rem - Tight spacing
  sm: '12px',   // 0.75rem - Compact spacing
  md: '16px',   // 1rem - Standard spacing
  lg: '24px',   // 1.5rem - Generous spacing
  xl: '32px',   // 2rem - Large spacing
  '2xl': '48px' // 3rem - Extra large spacing
} as const;

/**
 * Border Radius
 * Consistent corner rounding for different element types
 */
export const RADIUS = {
  button: '9999px',  // rounded-full for icon buttons
  card: '12px',      // rounded-xl for cards and KPI displays
  panel: '16px',     // rounded-2xl for panels and drawers
  input: '8px',      // rounded-lg for form inputs
  tag: '6px',        // rounded-md for tags/badges
} as const;

/**
 * Glassmorphism Patterns
 * Backdrop blur + opacity for floating UI elements
 */
export const GLASS = {
  light: 'bg-background/70 backdrop-blur-lg border border-border/40',
  medium: 'bg-background/80 backdrop-blur-md border border-border/50',
  dark: 'bg-background/90 backdrop-blur-sm border border-border/60',
  card: 'bg-card/90 backdrop-blur-md border border-border/40',
} as const;

/**
 * Shadow Elevation
 * Consistent shadow styles for depth
 */
export const SHADOW = {
  subtle: 'shadow-sm',           // Minimal elevation
  soft: 'shadow-md',             // Standard elevation
  floating: 'shadow-lg',         // Floating elements
  drawer: 'shadow-xl',           // Drawers and panels
  dramatic: 'shadow-2xl',        // Modal overlays
} as const;

/**
 * Z-Index Layers
 * Consistent stacking order for all map elements
 */
export const Z_INDEX = {
  map: 0,                 // Base map layer
  mapControls: 900,       // KPIRibbon, PlaybackBar (float above map)
  toolbar: 1000,          // MapToolbarClusters
  floatingPanels: 1000,   // SearchPanel, LayersPanel (same level as toolbar)
  drawer: 1100,           // AnalyticsDrawer (above floating panels)
  modal: 1200,            // Dialogs and modals
  entityDrawer: 1300,     // DriverDrawer, VehicleDrawer, BatchDrawer
  toast: 9999,            // Toast notifications (always on top)
} as const;

/**
 * Icon Sizes
 * Consistent icon sizing
 */
export const ICON_SIZE = {
  xs: 14,   // Small icons
  sm: 16,   // Compact icons
  md: 18,   // Standard icons
  lg: 20,   // Large icons
  xl: 24,   // Extra large icons
} as const;

/**
 * Button Sizes
 * Consistent button dimensions
 */
export const BUTTON_SIZE = {
  icon: 'w-10 h-10',           // Standard icon button
  iconSm: 'w-8 h-8',           // Small icon button
  iconLg: 'w-12 h-12',         // Large icon button
} as const;

/**
 * Transitions
 * Consistent animation timing
 */
export const TRANSITION = {
  fast: 'transition-all duration-150 ease-in-out',
  normal: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
  drawer: 'transition-transform duration-300 ease-in-out',
} as const;

/**
 * Container Widths
 * Standard container sizes for consistency
 */
export const CONTAINER = {
  toolbar: 'w-16',           // Toolbar cluster container
  drawer: 'w-[480px]',       // Analytics drawer
  playback: 'max-w-3xl',     // Playback bar
  kpi: 'max-w-2xl',          // KPI ribbon
  panel: 'w-80',             // Floating panels (SearchPanel, LayersPanel)
} as const;

/**
 * Heights
 * Standard heights for horizontal bars
 */
export const HEIGHT = {
  topbar: 'h-16',            // OperationalContextBar
  filterBar: 'h-12',         // FilterBar
  playback: 'h-16',          // PlaybackBar
} as const;

/**
 * Map Control Button Classes
 * Pre-composed class strings for map control buttons
 */
export const MAP_BUTTON = {
  base: `${BUTTON_SIZE.icon} rounded-full flex items-center justify-center ${TRANSITION.fast}`,
  glass: `${BUTTON_SIZE.icon} rounded-full ${GLASS.card} flex items-center justify-center ${SHADOW.soft} ${TRANSITION.fast}`,
  active: 'bg-primary text-primary-foreground',
  inactive: 'hover:bg-muted/50',
} as const;

/**
 * Floating Panel Classes
 * Pre-composed class strings for floating panels
 */
export const FLOATING_PANEL = {
  base: `${GLASS.medium} ${SHADOW.floating} rounded-xl`,
  kpi: `${GLASS.light} ${SHADOW.soft} rounded-xl`,
  toolbar: `${GLASS.card} ${SHADOW.soft} rounded-lg`,
} as const;

/**
 * Legacy Design System (for backward compatibility)
 * TODO: Migrate all legacy usage to new V3 tokens
 */
export const MAP_DESIGN_SYSTEM = {
  layout: {
    fullscreen: 'h-screen w-full',
    embedded: 'h-[600px] w-full rounded-lg overflow-hidden',
    dashboard: 'h-[800px] w-full',

    toolbar: {
      position: 'absolute top-24 left-4 z-floating',
      buttonSize: BUTTON_SIZE.icon,
      gap: 'gap-2',
      container: `flex flex-col ${GLASS.card} rounded-lg ${SHADOW.soft} p-2`,
    },

    bottomPanel: {
      height: 'h-60',
      position: 'absolute bottom-0 left-0 right-0 z-floating',
      container: `${GLASS.dark} border-t ${SHADOW.soft}`,
    },

    sidePanel: {
      width: 'w-80 max-w-[90vw]',
      position: 'absolute right-4 top-4 bottom-4 z-floating',
      container: `${GLASS.medium} border rounded-lg ${SHADOW.floating}`,
    },

    overlay: {
      topRight: 'absolute top-4 right-4 z-floating',
      topLeft: 'absolute top-4 left-20 z-floating',
      bottomRight: 'absolute bottom-4 right-4 z-floating',
      bottomLeft: 'absolute bottom-4 left-4 z-floating',
      container: `${GLASS.card} border rounded-lg ${SHADOW.floating}`,
    },
  },

  styling: {
    controlButton: `rounded-lg ${GLASS.card} hover:bg-accent hover:text-accent-foreground ${TRANSITION.fast} ${SHADOW.subtle} border`,
    panel: `${GLASS.card} border rounded-lg ${SHADOW.floating}`,
    selectedMarker: 'ring-2 ring-primary ring-offset-2',
    floatingCard: `${GLASS.card} border rounded-lg ${SHADOW.floating}`,
  },

  interactions: {
    markerClick: 'click' as const,
    zoomOnSelect: true,
    autoFitBounds: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
  },

  widths: {
    sm: CONTAINER.panel,
    md: 'w-96',
    lg: 'w-[500px]',
    xl: 'w-[600px]',
  },

  components: {
    core: 'LeafletMapCore',
    toolbar: 'MapToolbarClusters',
    bottomPanel: 'PlaybackBar',
    searchPanel: 'SearchPanel',
    layersPanel: 'LayersPanel',
    legend: 'MapLegend',
    drawControls: 'DrawControls',
  },
} as const;

export type MapMode = 'fullscreen' | 'embedded' | 'dashboard';
export type OverlayPosition = 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';

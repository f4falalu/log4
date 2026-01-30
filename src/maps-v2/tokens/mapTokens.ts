/**
 * Map-specific design tokens.
 * NOT Tailwind. NOT shadcn. NOT generic UI tokens.
 * These are compiled into MapLibre style expressions.
 */

export const mapTokens = {
  // Basemap palette
  background: '#0d1117',
  land: '#161b22',
  water: '#0d1117',
  roadPrimary: '#30363d',
  roadSecondary: '#21262d',
  boundary: '#30363d',
  labelMuted: '#484f58',
  labelPrimary: '#c9d1d9',

  // Risk spectrum
  riskNone: 'rgba(128,128,128,0.1)',
  riskLow: '#3fb950',
  riskMedium: '#d29922',
  riskHigh: '#f85149',
  riskCritical: '#da3633',

  // Interaction
  selectionStroke: '#58a6ff',
  selectionFill: 'rgba(88,166,255,0.15)',
  hoverStroke: '#79c0ff',
  hoverFill: 'rgba(121,192,255,0.08)',

  // Entity colors
  vehicleActive: '#58a6ff',
  vehicleIdle: '#8b949e',
  vehicleDelayed: '#d29922',
  vehicleOffline: '#484f58',

  facility: '#a5d6ff',
  warehouse: '#7ee787',
  alert: '#f85149',

  // Route
  routePlanned: '#484f58',
  routeCompleted: '#3fb950',
  routeActive: '#58a6ff',

  // Zone
  zoneBorder: '#58a6ff',
  zoneFill: 'rgba(88,166,255,0.08)',
} as const;

export type MapTokens = typeof mapTokens;

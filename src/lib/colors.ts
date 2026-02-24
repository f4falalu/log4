/**
 * Centralized Color Constants
 *
 * All hex color values used in JS/TS code should be imported from here.
 * For Tailwind CSS classes, use the design tokens in tailwind.config.ts.
 * For MapLibre layers, import specific palettes from this module.
 *
 * Naming follows Tailwind color scale conventions.
 */

// ── Tailwind Color Palette (hex values for JS contexts) ──────────────

export const tw = {
  // Gray
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Blue
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  // Green
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    800: '#166534',
  },
  // Emerald
  emerald: {
    500: '#10b981',
    600: '#059669',
    800: '#065f46',
  },
  // Red
  red: {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  // Amber
  amber: {
    500: '#f59e0b',
    800: '#92400e',
  },
  // Orange
  orange: {
    500: '#f97316',
    600: '#ea580c',
  },
  // Purple / Violet
  violet: {
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#5b21b6',
  },
  // Indigo
  indigo: {
    500: '#6366f1',
  },
  // Cyan
  cyan: {
    500: '#06b6d4',
  },
  // Teal
  teal: {
    500: '#14b8a6',
  },
  // Pink
  pink: {
    500: '#ec4899',
  },
  // Lime
  lime: {
    500: '#84cc16',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

// ── Semantic Status Colors ───────────────────────────────────────────

export const statusColors = {
  INACTIVE: tw.gray[500],
  ACTIVE: tw.blue[500],
  EN_ROUTE: tw.blue[500],
  AT_STOP: tw.green[500],
  DELAYED: tw.red[500],
  COMPLETED: tw.emerald[500],
  SUSPENDED: tw.amber[500],
  pending: tw.gray[400],
  completed: tw.emerald[500],
} as const;

// ── Map Entity Colors ────────────────────────────────────────────────

export const mapEntityColors = {
  warehouse: tw.violet[500],
  warehouseStroke: tw.violet[600],
  warehouseLabel: tw.violet[700],
  facility: tw.emerald[500],
  facilityLabel: tw.emerald[800],
  zone: tw.amber[500],
  zoneLabel: tw.amber[800],
  vehicle: tw.violet[500],
  driver: tw.blue[500],
  route: tw.blue[500],
} as const;

// ── Chart Colors ─────────────────────────────────────────────────────

export const chartColors = [
  tw.blue[500],
  tw.green[500],
  tw.amber[500],
  tw.red[500],
  tw.violet[500],
  tw.cyan[500],
  tw.orange[500],
  tw.pink[500],
  tw.lime[500],
  tw.indigo[500],
] as const;

// ── Facility Priority Colors ─────────────────────────────────────────

export const facilityPriorityColors = {
  Tertiary: tw.red[600],
  Secondary: tw.orange[600],
  Primary: tw.green[600],
  default: tw.gray[500],
} as const;

// ── Common text/bg hex values for popup HTML ─────────────────────────

export const popupColors = {
  textPrimary: tw.gray[700],
  textSecondary: tw.gray[500],
  textMuted: tw.gray[400],
  bgSubtle: tw.gray[100],
  border: tw.gray[200],
  badgePcr: { bg: tw.green[100], text: tw.green[800] },
  badgeCd4: { bg: tw.blue[100], text: '#1e40af' },
  btnPrimary: tw.blue[600],
  selectedGreen: tw.emerald[500],
  selectedGreenStroke: tw.emerald[600],
} as const;

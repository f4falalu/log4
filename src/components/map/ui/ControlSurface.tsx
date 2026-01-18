import { cn } from '@/lib/utils';
import { CONTROL_SURFACE, CONTROL_POSITIONS } from '@/lib/mapDesignSystem';

interface ControlSurfaceProps {
  variant: 'navigation' | 'tools' | 'playback' | 'kpi';
  children: React.ReactNode;
  position?: keyof typeof CONTROL_POSITIONS;
  className?: string;
}

/**
 * ControlSurface Component
 *
 * Guaranteed contrast container for all map controls.
 * Ensures controls are never visually compete with geospatial data.
 *
 * Industry Standard Enforcement:
 * - All controls sit on solid/glass backgrounds
 * - Guaranteed visibility on any basemap (light/dark)
 * - Consistent positioning and spacing
 * - Clear visual hierarchy
 *
 * Usage:
 * ```tsx
 * <ControlSurface variant="navigation" position="top-left">
 *   <Button>Zoom In</Button>
 *   <Button>Zoom Out</Button>
 * </ControlSurface>
 * ```
 */
export function ControlSurface({
  variant,
  children,
  position = 'top-left',
  className
}: ControlSurfaceProps) {
  return (
    <div className={cn(
      'absolute z-[1000]',
      CONTROL_POSITIONS[position],
      CONTROL_SURFACE[variant],
      CONTROL_SURFACE.padding,
      CONTROL_SURFACE.radius,
      'flex flex-col',
      CONTROL_SURFACE.gap,
      className
    )}>
      {children}
    </div>
  );
}

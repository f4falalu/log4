/**
 * ControlRail Component
 *
 * Left-side 64px vertical control rail for map operations
 * Reference: Cargo Run dark theme vertical icon rail
 *
 * Features:
 * - View mode indicator
 * - Filter button (opens ExpandableFilterPanel)
 * - Layer toggle buttons
 * - Zoom controls
 * - Locate button
 */

import { Sliders, Plus, Minus, Crosshair, Activity, GitBranch, Route, Building, Warehouse } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface LayerToggleProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Layer toggle button component
 */
function LayerToggle({ icon: Icon, label, active, onClick }: LayerToggleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
        'hover:bg-muted',
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
          : 'bg-background text-muted-foreground'
      )}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

interface ControlRailProps {
  onFilterClick: () => void;
  onLocateClick: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  layerVisibility: {
    trails: boolean;
    routes: boolean;
    facilities: boolean;
    warehouses: boolean;
  };
  onToggleLayer: (layer: string) => void;
}

/**
 * Control Rail Component
 *
 * 64px vertical sidebar with map controls
 */
export function ControlRail({
  onFilterClick,
  onLocateClick,
  onZoomIn,
  onZoomOut,
  layerVisibility,
  onToggleLayer,
}: ControlRailProps) {
  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full w-16',
        'bg-background/95 backdrop-blur-sm border-r border-border',
        'z-[900] flex flex-col items-center py-4 gap-6'
      )}
    >
      {/* Top Section - View Mode Indicator */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
          title="Operational View"
        >
          <Activity className="w-5 h-5 text-primary" />
        </div>

        <Separator className="w-8" />

        {/* Filter Button (Primary Control) */}
        <button
          onClick={onFilterClick}
          className={cn(
            'w-10 h-10 rounded-lg',
            'bg-background hover:bg-muted',
            'active:ring-2 active:ring-primary',
            'transition-all',
            'flex items-center justify-center',
            'text-foreground'
          )}
          title="Advanced Filters"
          aria-label="Open advanced filters"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Middle Section - Layer Toggles */}
      <div className="flex flex-col items-center gap-2 flex-1">
        <LayerToggle
          icon={GitBranch}
          label="Vehicle Trails"
          active={layerVisibility.trails}
          onClick={() => onToggleLayer('trails')}
        />
        <LayerToggle
          icon={Route}
          label="Routes"
          active={layerVisibility.routes}
          onClick={() => onToggleLayer('routes')}
        />
        <LayerToggle
          icon={Building}
          label="Facilities"
          active={layerVisibility.facilities}
          onClick={() => onToggleLayer('facilities')}
        />
        <LayerToggle
          icon={Warehouse}
          label="Warehouses"
          active={layerVisibility.warehouses}
          onClick={() => onToggleLayer('warehouses')}
        />
      </div>

      {/* Bottom Section - Zoom Controls */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onZoomIn}
          className={cn(
            'w-10 h-10 rounded-lg',
            'bg-background hover:bg-muted',
            'transition-all',
            'flex items-center justify-center',
            'text-foreground'
          )}
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={onZoomOut}
          className={cn(
            'w-10 h-10 rounded-lg',
            'bg-background hover:bg-muted',
            'transition-all',
            'flex items-center justify-center',
            'text-foreground'
          )}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={onLocateClick}
          className={cn(
            'w-10 h-10 rounded-lg',
            'bg-background hover:bg-muted',
            'transition-all',
            'flex items-center justify-center',
            'text-foreground'
          )}
          title="Recenter Map"
          aria-label="Recenter map"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

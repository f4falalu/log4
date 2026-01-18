/**
 * LayerControl Component
 *
 * Standard shadcn DropdownMenu for layer visibility control
 * Anchored to map canvas, no floating/translucent UI
 *
 * Design: Solid backgrounds, high contrast, production-ready
 * Focus Mode: Dim non-relevant entities for clarity
 */

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

export interface FocusMode {
  onlySelected: boolean;
  onlyIssues: boolean;
}

interface LayerControlProps {
  layerVisibility: {
    trails: boolean;
    routes: boolean;
    facilities: boolean;
    warehouses: boolean;
  };
  onToggleLayer: (layer: string) => void;
  focusMode?: FocusMode;
  onFocusModeChange?: (mode: FocusMode) => void;
}

export function LayerControl({
  layerVisibility,
  onToggleLayer,
  focusMode = { onlySelected: false, onlyIssues: false },
  onFocusModeChange,
}: LayerControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-9 w-9">
          <Layers className="h-4 w-4" />
          <span className="sr-only">Layer visibility</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        className="w-56 bg-background border border-border shadow-md rounded-md"
      >
        <DropdownMenuLabel>Layers</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={layerVisibility.trails}
          onCheckedChange={() => onToggleLayer('trails')}
        >
          Vehicle Trails
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={layerVisibility.routes}
          onCheckedChange={() => onToggleLayer('routes')}
        >
          Routes
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={layerVisibility.warehouses}
          onCheckedChange={() => onToggleLayer('warehouses')}
        >
          Warehouses
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={layerVisibility.facilities}
          onCheckedChange={() => onToggleLayer('facilities')}
        >
          Facilities
        </DropdownMenuCheckboxItem>

        {onFocusModeChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Focus Mode</DropdownMenuLabel>

            <DropdownMenuCheckboxItem
              checked={focusMode.onlySelected}
              onCheckedChange={(checked) =>
                onFocusModeChange({ ...focusMode, onlySelected: checked })
              }
            >
              Only Selected Vehicle
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={focusMode.onlyIssues}
              onCheckedChange={(checked) =>
                onFocusModeChange({ ...focusMode, onlyIssues: checked })
              }
            >
              Only Vehicles with Issues
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

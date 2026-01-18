/**
 * RepresentationToggle.tsx
 *
 * Toggle between minimal (geometric) and entity-rich (semantic icons) map representations
 * Wrapped in ControlSurface for guaranteed contrast on any basemap
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { iconMap } from '@/map/icons/iconMap';
import { ICON_STATE } from '@/lib/mapDesignSystem';
import { ControlSurface } from './ui/ControlSurface';
import { cn } from '@/lib/utils';

/**
 * Representation modes
 */
export type RepresentationMode = 'minimal' | 'entity-rich';

/**
 * Representation Toggle Props
 */
export interface RepresentationToggleProps {
  /** Current representation mode */
  mode?: RepresentationMode;

  /** Callback when mode changes */
  onModeChange?: (mode: RepresentationMode) => void;

  /** Default mode (initial value) */
  defaultMode?: RepresentationMode;

  /** Disabled state */
  disabled?: boolean;

  /** Custom className */
  className?: string;
}

/**
 * Representation Toggle Component
 *
 * GOVERNANCE RULE:
 * - Both modes show SAME data
 * - Only encoding changes (geometric vs semantic)
 * - Default mode depends on map context:
 *   - Planning → Entity-Rich
 *   - Operational → Entity-Rich
 *   - Forensic → Minimal
 */
export function RepresentationToggle({
  mode: controlledMode,
  onModeChange,
  defaultMode = 'entity-rich',
  disabled = false,
  className = '',
}: RepresentationToggleProps) {
  const [internalMode, setInternalMode] = useState<RepresentationMode>(defaultMode);

  // Use controlled mode if provided, otherwise use internal state
  const currentMode = controlledMode !== undefined ? controlledMode : internalMode;

  const handleToggle = () => {
    const newMode: RepresentationMode =
      currentMode === 'minimal' ? 'entity-rich' : 'minimal';

    // Update internal state if not controlled
    if (controlledMode === undefined) {
      setInternalMode(newMode);
    }

    // Notify parent
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const MinimalIcon = iconMap.controls.representationMinimal;
  const EntityRichIcon = iconMap.controls.representationEntity;

  return (
    <TooltipProvider>
      <ControlSurface variant="tools" position="top-center" className={cn('flex-row', className)}>
        {/* Minimal Mode Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                currentMode === 'minimal' ? ICON_STATE.active : ICON_STATE.default,
                disabled && ICON_STATE.disabled
              )}
              onClick={handleToggle}
              disabled={disabled}
              aria-label="Minimal representation"
              aria-pressed={currentMode === 'minimal'}
            >
              <MinimalIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Minimal</p>
            <p className="text-xs text-muted-foreground">
              Geometric markers, aggressive clustering
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="w-px h-8 bg-border/50" />

        {/* Entity-Rich Mode Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                currentMode === 'entity-rich' ? ICON_STATE.active : ICON_STATE.default,
                disabled && ICON_STATE.disabled
              )}
              onClick={handleToggle}
              disabled={disabled}
              aria-label="Entity-rich representation"
              aria-pressed={currentMode === 'entity-rich'}
            >
              <EntityRichIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Entity-Rich</p>
            <p className="text-xs text-muted-foreground">
              Semantic icons, labels, orientation
            </p>
          </TooltipContent>
        </Tooltip>
      </ControlSurface>
    </TooltipProvider>
  );
}

/**
 * Compact Representation Toggle (single button)
 * Toggles between modes with a single button
 */
export function RepresentationToggleCompact({
  mode: controlledMode,
  onModeChange,
  defaultMode = 'entity-rich',
  disabled = false,
  className = '',
}: RepresentationToggleProps) {
  const [internalMode, setInternalMode] = useState<RepresentationMode>(defaultMode);

  // Use controlled mode if provided, otherwise use internal state
  const currentMode = controlledMode !== undefined ? controlledMode : internalMode;

  const handleToggle = () => {
    const newMode: RepresentationMode =
      currentMode === 'minimal' ? 'entity-rich' : 'minimal';

    // Update internal state if not controlled
    if (controlledMode === undefined) {
      setInternalMode(newMode);
    }

    // Notify parent
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const MinimalIcon = iconMap.controls.representationMinimal;
  const EntityRichIcon = iconMap.controls.representationEntity;
  const CurrentIcon = currentMode === 'minimal' ? MinimalIcon : EntityRichIcon;

  return (
    <TooltipProvider>
      <ControlSurface variant="tools" position="top-center" className={className}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                ICON_STATE.default,
                disabled && ICON_STATE.disabled
              )}
              onClick={handleToggle}
              disabled={disabled}
              aria-label={`Toggle to ${currentMode === 'minimal' ? 'entity-rich' : 'minimal'} representation`}
            >
              <CurrentIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">
              {currentMode === 'minimal' ? 'Minimal' : 'Entity-Rich'} View
            </p>
            <p className="text-xs text-muted-foreground">
              Click to switch to {currentMode === 'minimal' ? 'entity-rich' : 'minimal'}
            </p>
          </TooltipContent>
        </Tooltip>
      </ControlSurface>
    </TooltipProvider>
  );
}

/**
 * Hook for using representation mode
 */
export function useRepresentationMode(defaultMode: RepresentationMode = 'entity-rich') {
  const [mode, setMode] = useState<RepresentationMode>(defaultMode);

  const toggleMode = () => {
    setMode((prev) => (prev === 'minimal' ? 'entity-rich' : 'minimal'));
  };

  const setMinimal = () => setMode('minimal');
  const setEntityRich = () => setMode('entity-rich');

  const isMinimal = mode === 'minimal';
  const isEntityRich = mode === 'entity-rich';

  return {
    mode,
    setMode,
    toggleMode,
    setMinimal,
    setEntityRich,
    isMinimal,
    isEntityRich,
  };
}

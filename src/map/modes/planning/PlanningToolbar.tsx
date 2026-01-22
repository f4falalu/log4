/**
 * PlanningToolbar.tsx
 *
 * Explicit user intent toolbar for Planning mode.
 *
 * GOVERNANCE:
 * - Makes user intent UNAMBIGUOUS
 * - Clicking a button ONLY changes FSM state
 * - Toolbar NEVER mutates data directly
 * - FSM state is always visible to the user
 */

import React from 'react';
import { Eye, MousePointer, Hexagon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { InteractionState } from '@/map/core/InteractionFSM';
import { cn } from '@/lib/utils';

/**
 * Toolbar action definition
 */
interface ToolbarAction {
  id: string;
  label: string;
  state: InteractionState;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

/**
 * Planning toolbar actions
 */
const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: 'inspect',
    label: 'Inspect',
    state: 'inspect',
    icon: Eye,
    tooltip: 'View zone information (read-only)',
  },
  {
    id: 'select',
    label: 'Select',
    state: 'select',
    icon: MousePointer,
    tooltip: 'Select existing zones',
  },
  {
    id: 'draw',
    label: 'Draw Zone',
    state: 'draw_zone',
    icon: Hexagon,
    tooltip: 'Draw a new zone boundary',
  },
  {
    id: 'tag',
    label: 'Tag Zone',
    state: 'tag_zone',
    icon: Tag,
    tooltip: 'Apply tags to selected zone',
  },
];

/**
 * Props
 */
interface PlanningToolbarProps {
  /** Current FSM state */
  currentState: InteractionState;

  /** Callback when state should change */
  onStateChange: (state: InteractionState) => void;

  /** Whether a zone is selected (enables tag button) */
  hasSelectedZone?: boolean;

  /** Whether drawing is in progress */
  isDrawing?: boolean;

  /** Callback to cancel drawing */
  onCancelDraw?: () => void;

  /** Callback to complete drawing */
  onCompleteDraw?: () => void;

  /** Number of points in current drawing */
  drawPointCount?: number;

  /** Additional class name */
  className?: string;
}

/**
 * PlanningToolbar - Intent selection toolbar
 *
 * This toolbar:
 * - Shows current FSM state
 * - Allows switching states
 * - Never mutates data
 */
export function PlanningToolbar({
  currentState,
  onStateChange,
  hasSelectedZone = false,
  isDrawing = false,
  onCancelDraw,
  onCompleteDraw,
  drawPointCount = 0,
  className,
}: PlanningToolbarProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1 p-1 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg',
          className
        )}
      >
        {/* Main action buttons */}
        {TOOLBAR_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isActive = currentState === action.state;
          const isDisabled =
            action.state === 'tag_zone' && !hasSelectedZone;

          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => onStateChange(action.state)}
                  className={cn(
                    'h-9 px-3',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{action.tooltip}</p>
                {isDisabled && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Select a zone first
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Drawing controls (shown when drawing) */}
        {isDrawing && (
          <>
            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
              <span>{drawPointCount} points</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelDraw}
                  className="h-9 px-3 text-destructive hover:text-destructive"
                >
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Cancel drawing (Esc)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={drawPointCount < 3}
                  onClick={onCompleteDraw}
                  className="h-9 px-3"
                >
                  Complete
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {drawPointCount < 3
                    ? `Add ${3 - drawPointCount} more points`
                    : 'Complete zone (Enter)'}
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* State indicator */}
        <div className="w-px h-6 bg-border mx-1" />
        <div className="flex items-center px-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full mr-2',
              currentState === 'inspect' && 'bg-blue-500',
              currentState === 'select' && 'bg-green-500',
              currentState === 'draw_zone' && 'bg-amber-500',
              currentState === 'tag_zone' && 'bg-purple-500'
            )}
          />
          <span className="text-xs text-muted-foreground capitalize">
            {currentState.replace('_', ' ')}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Keyboard shortcuts for Planning mode
 */
export const PLANNING_SHORTCUTS: Record<string, InteractionState | 'cancel' | 'complete'> = {
  'i': 'inspect',
  's': 'select',
  'd': 'draw_zone',
  't': 'tag_zone',
  'Escape': 'cancel',
  'Enter': 'complete',
};

/**
 * Hook for keyboard shortcuts
 */
export function usePlanningKeyboardShortcuts(
  onStateChange: (state: InteractionState) => void,
  onCancel?: () => void,
  onComplete?: () => void,
  isDrawing?: boolean
) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const action = PLANNING_SHORTCUTS[e.key];
      if (!action) return;

      if (action === 'cancel' && isDrawing && onCancel) {
        e.preventDefault();
        onCancel();
      } else if (action === 'complete' && isDrawing && onComplete) {
        e.preventDefault();
        onComplete();
      } else if (
        action !== 'cancel' &&
        action !== 'complete' &&
        !isDrawing
      ) {
        e.preventDefault();
        onStateChange(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStateChange, onCancel, onComplete, isDrawing]);
}

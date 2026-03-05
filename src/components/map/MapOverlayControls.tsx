import { Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MapOverlayControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  hasSelection?: boolean;
  className?: string;
}

/**
 * Map overlay controls styled to match the native MapLibre NavigationControl.
 * Buttons are 29×29px, grouped with border-radius: 4px, white background.
 * Position with className to sit directly below the zoom +/- group.
 */
export function MapOverlayControls({
  isFullscreen,
  onToggleFullscreen,
  isFocusMode,
  onToggleFocusMode,
  hasSelection = false,
  className = '',
}: MapOverlayControlsProps) {
  const buttonBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 29,
    height: 29,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      className={className}
      style={{
        background: '#fff',
        borderRadius: 4,
        boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            style={buttonBase}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Expand map'}
          >
            {isFullscreen ? (
              <Minimize2 style={{ width: 15, height: 15, color: '#333' }} />
            ) : (
              <Maximize2 style={{ width: 15, height: 15, color: '#333' }} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isFullscreen ? 'Exit fullscreen' : 'Expand map'}
        </TooltipContent>
      </Tooltip>

      <div style={{ borderTop: '1px solid #ddd' }} />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            style={{
              ...buttonBase,
              cursor: hasSelection ? 'pointer' : 'not-allowed',
              opacity: hasSelection ? 1 : 0.4,
              background: isFocusMode ? '#0096ff' : 'transparent',
            }}
            onClick={onToggleFocusMode}
            disabled={!hasSelection}
            aria-label={isFocusMode ? 'Show all facilities' : 'Focus on selected only'}
          >
            {isFocusMode ? (
              <EyeOff style={{ width: 15, height: 15, color: '#fff' }} />
            ) : (
              <Eye style={{ width: 15, height: 15, color: '#333' }} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isFocusMode ? 'Show all facilities' : 'Focus on selected only'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

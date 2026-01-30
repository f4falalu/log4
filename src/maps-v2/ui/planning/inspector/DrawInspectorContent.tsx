/**
 * DrawInspectorContent.tsx — Inspector content during Draw tool.
 *
 * Shows draft zone metadata: name, description, cell count, estimated area.
 */

import { useMapStore } from '../../../store/mapStore';

export function DrawInspectorContent() {
  const drawPoints = useMapStore((s) => s.drawPoints);
  const interactionState = useMapStore((s) => s.interactionState);

  const isDrawing = interactionState === 'DRAW_ZONE';
  const pointCount = drawPoints.length;

  // Rough area estimate: each H3 res-7 cell ≈ 5.16 km²
  // The actual cell count is computed after polygon completion
  const canPreview = pointCount >= 3;

  return (
    <div className="space-y-4">
      {/* Drawing status */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Drawing Status</div>
        {isDrawing ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">
              Drawing... {pointCount} point{pointCount !== 1 ? 's' : ''} placed
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-400">
            Click the Draw tool to start a new zone
          </div>
        )}
      </div>

      {/* Instructions */}
      {isDrawing && (
        <div className="space-y-1.5 bg-gray-800/50 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Instructions</div>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Click on the map to add vertices</li>
            <li>Place at least 3 points</li>
            <li>Double-click to complete the polygon</li>
            <li>Press Escape to cancel</li>
          </ul>
        </div>
      )}

      {/* Preview info */}
      {canPreview && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Preview</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="text-[10px] text-gray-500">Vertices</div>
              <div className="text-sm font-medium text-white">{pointCount}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="text-[10px] text-gray-500">Status</div>
              <div className="text-sm font-medium text-blue-400">
                {isDrawing ? 'In Progress' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone metadata (post-draw) */}
      {!isDrawing && pointCount === 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Zone Metadata</div>
          <div className="text-xs text-gray-500">
            Draw a zone to see its details here.
          </div>
        </div>
      )}
    </div>
  );
}

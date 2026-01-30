/**
 * DefaultInspectorContent.tsx — Basic cell/zone info.
 *
 * Shown when no tool is active but a selection exists.
 * Migrated logic from InspectPanel.tsx.
 */

import { useMapStore } from '../../../store/mapStore';

export function DefaultInspectorContent() {
  const selectedH3Indexes = useMapStore((s) => s.selectedH3Indexes);
  const selectedZoneId = useMapStore((s) => s.selectedZoneId);
  const cellStates = useMapStore((s) => s.cellStates);
  const zones = useMapStore((s) => s.zones);
  const zoneTags = useMapStore((s) => s.zoneTags);

  const selectedCells = cellStates.filter((c) =>
    selectedH3Indexes.includes(c.h3Index)
  );
  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const selectedZoneTags = selectedZone
    ? zoneTags.filter((t) => t.zoneId === selectedZone.id)
    : [];

  if (selectedCells.length === 0 && !selectedZone) {
    return (
      <div className="text-xs text-gray-500">
        Click a cell or zone on the map to inspect.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedZone && (
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-white">{selectedZone.name}</div>
          <div className="text-xs text-gray-400">{selectedZone.description}</div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Status: <span className="text-blue-400">{selectedZone.status}</span></span>
            <span>Cells: {selectedZone.h3Indexes.length}</span>
          </div>
          {selectedZoneTags.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Tags</div>
              {selectedZoneTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-yellow-400">{tag.type}</span>
                  <span>S{tag.severity}</span>
                  <span>C{(tag.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedCells.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
            Cells ({selectedCells.length})
          </div>
          {selectedCells.slice(0, 5).map((cell) => (
            <div key={cell.h3Index} className="mb-2 pb-2 border-b border-gray-800 last:border-0">
              <div className="text-gray-300 font-mono text-[10px]">{cell.h3Index}</div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>
                  Risk: <span className={
                    cell.effectiveRiskScore > 60 ? 'text-red-400' :
                    cell.effectiveRiskScore > 30 ? 'text-yellow-400' :
                    'text-green-400'
                  }>{cell.effectiveRiskScore}</span>
                </span>
                <span>Zones: {cell.zoneIds.length}</span>
              </div>
              {Object.entries(cell.flags).filter(([, v]) => v).length > 0 && (
                <div className="text-orange-400 text-[10px] mt-0.5">
                  {Object.entries(cell.flags)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(', ')}
                </div>
              )}
            </div>
          ))}
          {selectedCells.length > 5 && (
            <div className="text-[10px] text-gray-600">
              +{selectedCells.length - 5} more cells
            </div>
          )}
        </div>
      )}
    </div>
  );
}

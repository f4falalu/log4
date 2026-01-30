/**
 * InspectPanel.tsx — Side panel for cell/zone inspection.
 */

import { useMapStore } from '../store/mapStore';

export function InspectPanel() {
  const selectedH3Indexes = useMapStore((s) => s.selectedH3Indexes);
  const selectedZoneId = useMapStore((s) => s.selectedZoneId);
  const cellStates = useMapStore((s) => s.cellStates);
  const zones = useMapStore((s) => s.zones);
  const zoneTags = useMapStore((s) => s.zoneTags);
  const auditLog = useMapStore((s) => s.auditLog);
  const interactionState = useMapStore((s) => s.interactionState);

  const selectedCells = cellStates.filter((c) =>
    selectedH3Indexes.includes(c.h3Index)
  );

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const selectedZoneTags = selectedZone
    ? zoneTags.filter((t) => t.zoneId === selectedZone.id)
    : [];

  if (selectedCells.length === 0 && !selectedZone) {
    return (
      <div className="absolute top-16 right-4 w-64 bg-gray-900/95 rounded-lg p-3 text-xs text-gray-400 backdrop-blur-sm border border-gray-700/50">
        <div className="text-gray-500 uppercase tracking-wide mb-1">Inspect</div>
        <div>Click a cell or zone to inspect</div>
        <div className="mt-2 text-gray-600">
          State: <span className="text-gray-400">{interactionState}</span>
        </div>
        {auditLog.length > 0 && (
          <div className="mt-2 border-t border-gray-700 pt-2">
            <div className="text-gray-500 uppercase tracking-wide mb-1">
              Audit Log ({auditLog.length})
            </div>
            {auditLog.slice(-3).map((entry) => (
              <div key={entry.id} className="text-gray-500 truncate">
                {entry.action} — {entry.reason}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-16 right-4 w-72 bg-gray-900/95 rounded-lg p-3 text-xs backdrop-blur-sm border border-gray-700/50 max-h-[70vh] overflow-y-auto">
      <div className="text-gray-500 uppercase tracking-wide mb-2">Inspection</div>

      {selectedZone && (
        <div className="mb-3">
          <div className="text-white font-medium">{selectedZone.name}</div>
          <div className="text-gray-400 mt-1">{selectedZone.description}</div>
          <div className="text-gray-500 mt-1">
            Status: <span className="text-blue-400">{selectedZone.status}</span>
          </div>
          <div className="text-gray-500">
            Cells: {selectedZone.h3Indexes.length}
          </div>
          {selectedZoneTags.length > 0 && (
            <div className="mt-2">
              <div className="text-gray-500 uppercase tracking-wide mb-1">Tags</div>
              {selectedZoneTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 text-gray-400">
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
          <div className="text-gray-500 uppercase tracking-wide mb-1">
            Cells ({selectedCells.length})
          </div>
          {selectedCells.slice(0, 5).map((cell) => (
            <div key={cell.h3Index} className="mb-2 border-b border-gray-800 pb-2">
              <div className="text-gray-300 font-mono text-[10px]">{cell.h3Index}</div>
              <div className="text-gray-500">
                Risk: <span className={`${
                  cell.effectiveRiskScore > 60 ? 'text-red-400' :
                  cell.effectiveRiskScore > 30 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>{cell.effectiveRiskScore}</span>
              </div>
              <div className="text-gray-500">
                Zones: {cell.zoneIds.length}
              </div>
              {Object.entries(cell.flags).filter(([, v]) => v).length > 0 && (
                <div className="text-orange-400 mt-0.5">
                  {Object.entries(cell.flags)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(', ')}
                </div>
              )}
            </div>
          ))}
          {selectedCells.length > 5 && (
            <div className="text-gray-600">
              +{selectedCells.length - 5} more cells
            </div>
          )}
        </div>
      )}
    </div>
  );
}

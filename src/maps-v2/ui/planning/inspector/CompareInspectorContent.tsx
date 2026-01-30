/**
 * CompareInspectorContent.tsx — Inspector content during Compare tool.
 *
 * Shows side-by-side metrics for 2 selected zones.
 * Displays delta values for each metric.
 */

import { useMapStore } from '../../../store/mapStore';

export function CompareInspectorContent() {
  const compareZoneIds = useMapStore((s) => s.compareZoneIds);
  const zones = useMapStore((s) => s.zones);
  const cellStates = useMapStore((s) => s.cellStates);
  const selectedZoneId = useMapStore((s) => s.selectedZoneId);

  const zoneA = compareZoneIds ? zones.find((z) => z.id === compareZoneIds[0]) : null;
  const zoneB = compareZoneIds ? zones.find((z) => z.id === compareZoneIds[1]) : null;

  // If we don't have 2 zones yet, show selection instructions
  if (!zoneA || !zoneB) {
    const selectedCount = compareZoneIds
      ? compareZoneIds.filter(Boolean).length
      : selectedZoneId ? 1 : 0;

    return (
      <div className="space-y-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Zone Comparison</div>
        <div className="text-xs text-gray-400">
          Select 2 zones on the map to compare them.
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${selectedCount >= 1 ? 'bg-blue-400' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-400">Zone A {selectedCount >= 1 ? '(selected)' : ''}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`w-3 h-3 rounded-full ${selectedCount >= 2 ? 'bg-purple-400' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-400">Zone B {selectedCount >= 2 ? '(selected)' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  // Compute metrics for each zone
  const zoneCellsA = cellStates.filter((c) => c.zoneIds.includes(zoneA.id));
  const zoneCellsB = cellStates.filter((c) => c.zoneIds.includes(zoneB.id));

  const avgRiskA = zoneCellsA.length > 0
    ? zoneCellsA.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / zoneCellsA.length
    : 0;
  const avgRiskB = zoneCellsB.length > 0
    ? zoneCellsB.reduce((sum, c) => sum + c.effectiveRiskScore, 0) / zoneCellsB.length
    : 0;

  // Area estimate: each H3 res-7 cell ≈ 5.16 km²
  const areaA = zoneA.h3Indexes.length * 5.16;
  const areaB = zoneB.h3Indexes.length * 5.16;

  // Overlap
  const sharedCells = zoneA.h3Indexes.filter((h) => zoneB.h3Indexes.includes(h));
  const overlapPct = Math.max(zoneA.h3Indexes.length, zoneB.h3Indexes.length) > 0
    ? (sharedCells.length / Math.max(zoneA.h3Indexes.length, zoneB.h3Indexes.length)) * 100
    : 0;

  const metrics = [
    { label: 'Cells', a: zoneA.h3Indexes.length, b: zoneB.h3Indexes.length, unit: '' },
    { label: 'Area', a: areaA, b: areaB, unit: 'km²' },
    { label: 'Avg Risk', a: avgRiskA, b: avgRiskB, unit: '' },
  ];

  return (
    <div className="space-y-4">
      {/* Zone headers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div />
        <div>
          <div className="text-[10px] text-blue-400 uppercase tracking-wide">Zone A</div>
          <div className="text-xs text-white font-medium truncate">{zoneA.name}</div>
        </div>
        <div>
          <div className="text-[10px] text-purple-400 uppercase tracking-wide">Zone B</div>
          <div className="text-xs text-white font-medium truncate">{zoneB.name}</div>
        </div>
      </div>

      {/* Metrics comparison */}
      <div className="space-y-2">
        {metrics.map((m) => {
          const delta = m.a - m.b;
          return (
            <div key={m.label} className="grid grid-cols-3 gap-2 items-center bg-gray-800/50 rounded-lg p-2">
              <div className="text-[10px] text-gray-500">{m.label}</div>
              <div className="text-xs text-white text-center">
                {m.a.toFixed(m.unit === 'km²' ? 1 : 0)}{m.unit}
              </div>
              <div className="text-xs text-white text-center">
                {m.b.toFixed(m.unit === 'km²' ? 1 : 0)}{m.unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delta summary */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Overlap</div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Shared cells</span>
            <span className="text-xs text-white">{sharedCells.length}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">Overlap %</span>
            <span className="text-xs text-white">{overlapPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CoverageInspectorContent.tsx — Inspector content during Coverage tool.
 *
 * Shows facility reach stats, cells covered, and gap analysis.
 */

import { useMapStore } from '../../../store/mapStore';
import { MetricPill } from '../MetricPill';

export function CoverageInspectorContent() {
  const zones = useMapStore((s) => s.zones);
  const cellStates = useMapStore((s) => s.cellStates);

  // Compute basic coverage stats
  const totalCells = cellStates.length;
  const coveredCells = cellStates.filter((c) => c.zoneIds.length > 0).length;
  const coveragePct = totalCells > 0 ? (coveredCells / totalCells) * 100 : 0;
  const gapCells = totalCells - coveredCells;

  // Risk breakdown
  const highRiskCells = cellStates.filter((c) => c.effectiveRiskScore > 60).length;
  const mediumRiskCells = cellStates.filter((c) => c.effectiveRiskScore > 30 && c.effectiveRiskScore <= 60).length;

  return (
    <div className="space-y-4">
      {/* Coverage overview */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Coverage Overview</div>
        <div className="flex items-center gap-4">
          <MetricPill label="Coverage" value={coveragePct} unit="%" color="green" />
          <MetricPill label="Gap Cells" value={gapCells} unit="" color="yellow" />
        </div>
      </div>

      {/* Coverage ring legend */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Facility Reach Rings</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400/30 border border-green-400" />
            <span className="text-xs text-gray-400">5 km — Primary coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400/30 border border-yellow-400" />
            <span className="text-xs text-gray-400">10 km — Extended reach</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/30 border border-red-400" />
            <span className="text-xs text-gray-400">15 km — Maximum range</span>
          </div>
        </div>
      </div>

      {/* Cell stats */}
      <div className="space-y-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Cell Statistics</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">Total Cells</div>
            <div className="text-sm font-medium text-white">{totalCells}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">Zones</div>
            <div className="text-sm font-medium text-white">{zones.length}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">High Risk</div>
            <div className="text-sm font-medium text-red-400">{highRiskCells}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">Medium Risk</div>
            <div className="text-sm font-medium text-yellow-400">{mediumRiskCells}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

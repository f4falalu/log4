/**
 * PlanningSummaryStrip.tsx — Label 4: Bottom Analytics Summary.
 *
 * Position: Bottom-left overlay.
 * Always visible in planning mode.
 * Displays aggregate planning metrics (never interactive).
 */

import { useMapStore } from '../../store/mapStore';
import { MetricPill } from './MetricPill';

export function PlanningSummaryStrip() {
  const metrics = useMapStore((s) => s.planningMetrics);

  return (
    <div className="absolute bottom-4 left-4 z-[850] h-16 min-w-[420px] flex items-center gap-4 px-5 bg-white/92 dark:bg-gray-900/92 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <MetricPill
        label="Demand Covered"
        value={metrics.demandCoveredPct}
        unit="%"
        color="green"
      />
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
      <MetricPill
        label="Service Gap"
        value={metrics.serviceGapPct}
        unit="%"
        color="yellow"
      />
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
      <MetricPill
        label="SLA Impact"
        value={metrics.slaImpactScore}
        unit="pts"
        color="blue"
      />
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
      <MetricPill
        label="Risk Exposure"
        value={metrics.riskExposureScore}
        unit="pts"
        color="red"
      />
    </div>
  );
}

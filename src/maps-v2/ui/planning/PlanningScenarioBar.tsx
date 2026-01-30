/**
 * PlanningScenarioBar.tsx — Label 2: Timeline / Scenario Scrubber.
 *
 * Position: Bottom-center overlay.
 * Contains scenario selector, time horizon toggle, and state indicator.
 * Read-only: no geometry mutation.
 * Hidden when Draw or Compare tools are active.
 */

import { useMapStore } from '../../store/mapStore';
import type { TimeHorizon } from '../../contracts/PlanningTypes';

const TIME_HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '60d', label: '60d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '180d' },
];

const STATE_STYLES: Record<string, string> = {
  draft: 'bg-gray-600 text-gray-200',
  review: 'bg-yellow-600/80 text-yellow-100',
  active: 'bg-green-600/80 text-green-100',
};

/** Demo scenarios for in-memory use */
const DEMO_SCENARIOS = [
  { id: 'scenario-1', name: 'Baseline Coverage' },
  { id: 'scenario-2', name: 'Expansion Plan A' },
  { id: 'scenario-3', name: 'Risk Mitigation' },
];

export function PlanningScenarioBar() {
  const activeScenarioId = useMapStore((s) => s.activeScenarioId);
  const scenarioState = useMapStore((s) => s.scenarioState);
  const timeHorizon = useMapStore((s) => s.scenarioTimeHorizon);
  const setActiveScenario = useMapStore((s) => s.setActiveScenario);
  const setTimeHorizon = useMapStore((s) => s.setScenarioTimeHorizon);

  return (
    <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-[900] w-[720px] h-12 flex items-center gap-3 px-4 bg-white/92 dark:bg-gray-900/92 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      {/* Scenario selector */}
      <select
        value={activeScenarioId ?? ''}
        onChange={(e) => setActiveScenario(e.target.value || null)}
        className="h-8 px-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 min-w-[160px]"
      >
        <option value="">Select Scenario</option>
        {DEMO_SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* Time horizon toggle */}
      <div className="flex items-center gap-1">
        {TIME_HORIZONS.map((th) => {
          const isActive = timeHorizon === th.value;
          return (
            <button
              key={th.value}
              onClick={() => setTimeHorizon(th.value)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {th.label}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* Scenario state badge */}
      <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded ${STATE_STYLES[scenarioState] ?? STATE_STYLES.draft}`}>
        {scenarioState}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls hint */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500">Scenario view</span>
      </div>
    </div>
  );
}

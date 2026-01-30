/**
 * usePlanningPanelVisibility.ts — Derives panel visibility from store state.
 *
 * Pure derivation. No side effects.
 * Determines which overlay panels should be visible based on:
 * - Active planning tool
 * - Current selection
 * - Interaction state
 */

import { useMapStore } from '../../store/mapStore';

export function usePlanningPanelVisibility() {
  const activeTool = useMapStore((s) => s.activePlanningTool);
  const selectedH3 = useMapStore((s) => s.selectedH3Indexes);
  const selectedZone = useMapStore((s) => s.selectedZoneId);
  const interactionState = useMapStore((s) => s.interactionState);

  // Scenario bar hidden during draw and compare
  const showScenarioBar = activeTool !== 'draw' && activeTool !== 'compare';

  // Inspector visible when:
  // - Draw tool active (always show drawing instructions)
  // - Tag tool active (always show tag editor)
  // - Compare tool active (always show comparison)
  // - Coverage tool active
  // - Any selection exists
  const showInspector =
    activeTool === 'draw' ||
    activeTool === 'tag' ||
    activeTool === 'compare' ||
    activeTool === 'coverage' ||
    selectedH3.length > 0 ||
    selectedZone !== null;

  // Confirm gate overlay when in CONFIRM interaction state
  const showConfirmGate = interactionState === 'CONFIRM';

  return { showScenarioBar, showInspector, showConfirmGate };
}

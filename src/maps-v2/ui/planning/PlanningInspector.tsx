/**
 * PlanningInspector.tsx — Label 3: Right-Side Inspector Panel.
 *
 * Position: Right overlay (top:72px, right:16px).
 * Dynamic content routed by the active planning tool.
 * Auto-opens on selection, auto-closes on deselect.
 */

import { useMapStore } from '../../store/mapStore';
import { InspectorHeader } from './inspector/InspectorHeader';
import { DefaultInspectorContent } from './inspector/DefaultInspectorContent';
import { DrawInspectorContent } from './inspector/DrawInspectorContent';
import { CoverageInspectorContent } from './inspector/CoverageInspectorContent';
import { TagInspectorContent } from './inspector/TagInspectorContent';
import { CompareInspectorContent } from './inspector/CompareInspectorContent';

interface PlanningInspectorProps {
  onClose: () => void;
}

export function PlanningInspector({ onClose }: PlanningInspectorProps) {
  const activeTool = useMapStore((s) => s.activePlanningTool);

  return (
    <div className="absolute top-[72px] right-4 z-[950] w-[360px] max-h-[calc(100vh-96px)] bg-white/92 dark:bg-gray-900/95 backdrop-blur-sm rounded-[14px] border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-y-auto">
      <div className="p-4">
        <InspectorHeader activeTool={activeTool} onClose={onClose} />
        <InspectorContent activeTool={activeTool} />
      </div>
    </div>
  );
}

function InspectorContent({ activeTool }: { activeTool: string | null }) {
  switch (activeTool) {
    case 'draw':
      return <DrawInspectorContent />;
    case 'coverage':
      return <CoverageInspectorContent />;
    case 'tag':
      return <TagInspectorContent />;
    case 'compare':
      return <CompareInspectorContent />;
    default:
      return <DefaultInspectorContent />;
  }
}

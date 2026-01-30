/**
 * InspectorHeader.tsx — Header for the planning inspector panel.
 *
 * Shows contextual title based on active tool + close button.
 */

import { X } from 'lucide-react';
import type { PlanningTool } from '../../../contracts/PlanningTypes';

interface InspectorHeaderProps {
  activeTool: PlanningTool;
  onClose: () => void;
}

const TOOL_TITLES: Record<string, string> = {
  draw: 'Zone Draft',
  coverage: 'Coverage Analysis',
  tag: 'Zone Tagging',
  compare: 'Zone Comparison',
};

export function InspectorHeader({ activeTool, onClose }: InspectorHeaderProps) {
  const title = activeTool ? TOOL_TITLES[activeTool] ?? 'Inspector' : 'Inspector';

  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide">
        {title}
      </h3>
      <button
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

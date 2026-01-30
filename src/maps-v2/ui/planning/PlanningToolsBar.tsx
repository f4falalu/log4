/**
 * PlanningToolsBar.tsx — Label 1: Advanced Planning Tools Bar.
 *
 * Position: Top-right overlay.
 * Controls which planning tool is active (one at a time, toggle behavior).
 * Drives cursor, interaction constraints, and panel visibility.
 */

import { PenTool, Layers, Tag, BarChart2 } from 'lucide-react';
import { useMapStore } from '../../store/mapStore';
import type { PlanningTool } from '../../contracts/PlanningTypes';

interface ToolDef {
  id: NonNullable<PlanningTool>;
  icon: React.ReactNode;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: 'draw', icon: <PenTool size={18} />, label: 'Freehand Draw' },
  { id: 'coverage', icon: <Layers size={18} />, label: 'Coverage Overlay' },
  { id: 'tag', icon: <Tag size={18} />, label: 'Zone Tagging' },
  { id: 'compare', icon: <BarChart2 size={18} />, label: 'Zone Comparison' },
];

export function PlanningToolsBar() {
  const activeTool = useMapStore((s) => s.activePlanningTool);
  const setActiveTool = useMapStore((s) => s.setActivePlanningTool);

  const handleToolClick = (toolId: NonNullable<PlanningTool>) => {
    // Toggle: clicking active tool deactivates it
    if (activeTool === toolId) {
      setActiveTool(null);
    } else {
      setActiveTool(toolId);
    }
  };

  return (
    <div className="absolute top-4 right-6 z-[1000] flex items-center gap-2 h-[44px] px-1 bg-white/92 dark:bg-gray-900/92 backdrop-blur-sm rounded-[10px] border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            title={tool.label}
            className={`
              w-9 h-9 flex items-center justify-center rounded-lg transition-colors
              ${isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            {tool.icon}
          </button>
        );
      })}
    </div>
  );
}

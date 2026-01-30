/**
 * ModeSwitcher.tsx — Mode toggle buttons.
 */

import { useMapStore } from '../store/mapStore';
import type { MapMode } from '../core/types';

const MODES: { mode: MapMode; label: string; description: string }[] = [
  { mode: 'operational', label: 'Operational', description: 'Live monitoring' },
  { mode: 'planning', label: 'Planning', description: 'Zone management' },
  { mode: 'forensic', label: 'Forensic', description: 'Replay & audit' },
];

export function ModeSwitcher() {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);

  return (
    <div className="flex gap-1 bg-gray-900/90 rounded-lg p-1 backdrop-blur-sm">
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === m.mode
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
          title={m.description}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

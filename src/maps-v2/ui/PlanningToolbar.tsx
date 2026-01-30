/**
 * PlanningToolbar.tsx — Zone drawing and tagging tools.
 *
 * Only visible in Planning mode.
 * Tools: Draw Zone, Tag Zone, Confirm/Cancel gate
 */

import { useMapStore } from '../store/mapStore';
import type { InteractionState } from '../core/types';

interface PlanningToolbarProps {
  onStartDraw: () => void;
  onCancelDraw: () => void;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  pendingDescription?: string;
}

export function PlanningToolbar({
  onStartDraw,
  onCancelDraw,
  onConfirm,
  onCancel,
  pendingDescription,
}: PlanningToolbarProps) {
  const interactionState = useMapStore((s) => s.interactionState);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 rounded-lg p-2 backdrop-blur-sm border border-gray-700/50 flex items-center gap-2">
      {interactionState === 'CONFIRM' ? (
        <ConfirmGateUI
          description={pendingDescription ?? 'Confirm action'}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : interactionState === 'DRAW_ZONE' ? (
        <DrawingUI onCancel={onCancelDraw} />
      ) : (
        <ToolButtons
          interactionState={interactionState}
          onStartDraw={onStartDraw}
        />
      )}
    </div>
  );
}

function ToolButtons({
  interactionState,
  onStartDraw,
}: {
  interactionState: InteractionState;
  onStartDraw: () => void;
}) {
  return (
    <>
      <button
        onClick={onStartDraw}
        disabled={interactionState !== 'IDLE' && interactionState !== 'SELECT'}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded-md transition-colors"
      >
        Draw Zone
      </button>
      <span className="text-gray-600 text-xs">|</span>
      <span className="text-gray-500 text-xs">
        {interactionState}
      </span>
    </>
  );
}

function DrawingUI({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <span className="text-blue-400 text-xs animate-pulse">
        Drawing... click to add points, double-click to complete
      </span>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium rounded-md transition-colors"
      >
        Cancel
      </button>
    </>
  );
}

function ConfirmGateUI({
  description,
  onConfirm,
  onCancel,
}: {
  description: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs">
        <div className="text-yellow-400 font-medium">Confirm Action</div>
        <div className="text-gray-400">{description}</div>
      </div>
      <input
        type="text"
        placeholder="Reason..."
        id="confirm-reason"
        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white w-40"
      />
      <button
        onClick={() => {
          const input = document.getElementById('confirm-reason') as HTMLInputElement;
          onConfirm(input?.value || 'No reason provided');
        }}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-md transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

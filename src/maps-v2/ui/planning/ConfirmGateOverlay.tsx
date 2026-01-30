/**
 * ConfirmGateOverlay.tsx — Mutation confirmation dialog overlay.
 *
 * Appears center-bottom when InteractionState === CONFIRM.
 * Requires a reason before allowing mutation.
 */

import { useState } from 'react';

interface ConfirmGateOverlayProps {
  description: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ConfirmGateOverlay({ description, onConfirm, onCancel }: ConfirmGateOverlayProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1100] bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-2xl min-w-[400px]">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-yellow-400 text-xs font-medium uppercase tracking-wide">
            Confirm Action
          </div>
          <div className="text-gray-300 text-sm mt-1">{description}</div>
        </div>

        <input
          type="text"
          placeholder="Reason for this action..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && reason.trim()) {
              onConfirm(reason.trim());
            }
            if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || 'No reason provided')}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

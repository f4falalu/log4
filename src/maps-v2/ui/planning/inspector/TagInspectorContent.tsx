/**
 * TagInspectorContent.tsx — Inspector content during Tag tool.
 *
 * Shows tag editor form: type selector, severity, confidence, rationale.
 * Allows applying semantic tags to the selected zone.
 */

import { useState } from 'react';
import { useMapStore } from '../../../store/mapStore';
import type { ZoneTagType } from '../../../contracts/ZoneTag';

const TAG_TYPES: { value: ZoneTagType; label: string }[] = [
  { value: 'HARD_TO_REACH', label: 'Hard to Reach' },
  { value: 'SECURITY_THREAT', label: 'Security Threat' },
  { value: 'FLOOD_RISK', label: 'Flood Risk' },
  { value: 'CONFLICT_ZONE', label: 'Conflict Zone' },
  { value: 'RESTRICTED_ACCESS', label: 'Restricted Access' },
];

const SEVERITY_LABELS = ['', 'Low', 'Medium', 'High', 'Critical', 'Extreme'];

export function TagInspectorContent() {
  const selectedZoneId = useMapStore((s) => s.selectedZoneId);
  const zones = useMapStore((s) => s.zones);
  const zoneTags = useMapStore((s) => s.zoneTags);

  const [tagType, setTagType] = useState<ZoneTagType>('HARD_TO_REACH');
  const [severity, setSeverity] = useState<number>(3);
  const [confidence, setConfidence] = useState<number>(0.8);
  const [rationale, setRationale] = useState('');

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const existingTags = selectedZone
    ? zoneTags.filter((t) => t.zoneId === selectedZone.id)
    : [];

  if (!selectedZone) {
    return (
      <div className="space-y-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Zone Tagging</div>
        <div className="text-xs text-gray-400">
          Select a zone on the map to apply tags.
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500">
            Tags classify zones with semantic meaning (risk, accessibility, etc.)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected zone info */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Selected Zone</div>
        <div className="text-sm font-medium text-white">{selectedZone.name}</div>
        <div className="text-xs text-gray-500">{selectedZone.h3Indexes.length} cells</div>
      </div>

      {/* Existing tags */}
      {existingTags.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">
            Existing Tags ({existingTags.length})
          </div>
          {existingTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 text-xs bg-gray-800/50 rounded px-2 py-1">
              <span className="text-yellow-400">{tag.type.replace(/_/g, ' ')}</span>
              <span className="text-gray-500">S{tag.severity}</span>
              <span className="text-gray-500">C{(tag.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Tag form */}
      <div className="space-y-3 border-t border-gray-800 pt-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">Apply New Tag</div>

        {/* Type */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500">Tag Type</label>
          <select
            value={tagType}
            onChange={(e) => setTagType(e.target.value as ZoneTagType)}
            className="w-full h-8 px-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {TAG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500">
            Severity: {SEVERITY_LABELS[severity]} ({severity}/5)
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500">
            Confidence: {(confidence * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={confidence * 100}
            onChange={(e) => setConfidence(Number(e.target.value) / 100)}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Rationale */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500">Rationale</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Reason for this tag..."
            rows={2}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          disabled={!rationale.trim()}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Apply Tag
        </button>
      </div>
    </div>
  );
}

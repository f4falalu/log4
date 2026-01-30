/**
 * MetricPill.tsx — Compact metric display atom.
 *
 * Shows a label + value in a vertical stack.
 * Used by PlanningSummaryStrip and inspector panels.
 */

interface MetricPillProps {
  label: string;
  value: number;
  unit?: string;
  color?: 'green' | 'yellow' | 'blue' | 'red' | 'gray';
}

const COLOR_MAP: Record<string, string> = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  blue: 'text-blue-400',
  red: 'text-red-400',
  gray: 'text-gray-400',
};

export function MetricPill({ label, value, unit = '%', color = 'gray' }: MetricPillProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide whitespace-nowrap">
        {label}
      </span>
      <span className={`text-sm font-semibold ${COLOR_MAP[color] ?? COLOR_MAP.gray}`}>
        {value.toFixed(0)}{unit}
      </span>
    </div>
  );
}

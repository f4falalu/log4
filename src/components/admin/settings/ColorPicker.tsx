import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {ACCENT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(color.value)}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring',
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
          style={{ backgroundColor: color.value }}
          title={color.name}
        >
          {value === color.value && (
            <Check className="h-4 w-4 text-white" />
          )}
        </button>
      ))}
    </div>
  );
}

export { ACCENT_COLORS };

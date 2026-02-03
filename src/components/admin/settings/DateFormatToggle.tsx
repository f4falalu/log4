import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'mm/dd/yyyy' },
  { value: 'DD/MM/YYYY', label: 'dd/mm/yyyy' },
  { value: 'YYYY/MM/DD', label: 'yyyy/mm/dd' },
];

interface DateFormatToggleProps {
  value: string;
  onChange: (format: string) => void;
  disabled?: boolean;
}

export function DateFormatToggle({ value, onChange, disabled }: DateFormatToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val)}
      disabled={disabled}
      className="justify-start"
    >
      {DATE_FORMATS.map((format) => (
        <ToggleGroupItem
          key={format.value}
          value={format.value}
          className="px-4 data-[state=on]:bg-muted"
        >
          {format.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { DATE_FORMATS };

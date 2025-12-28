import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  label: string;
  description?: string;
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  layout?: 'grid' | 'list';
  columns?: 2 | 3 | 4;
  className?: string;
  required?: boolean;
}

/**
 * CheckboxGroup - Structured checkbox group with visual grouping
 *
 * Provides a consistent interface for multi-select operations with
 * clear visual organization and optional grid layout.
 *
 * @example
 * ```tsx
 * <CheckboxGroup
 *   label="Delivery Capabilities"
 *   description="Select all applicable capabilities"
 *   options={[
 *     { id: 'cold_chain', label: 'Cold Chain', description: 'Temperature controlled' },
 *     { id: 'hazmat', label: 'Hazmat Certified' },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 *   layout="grid"
 *   columns={2}
 * />
 * ```
 */
export function CheckboxGroup({
  label,
  description,
  options,
  value,
  onChange,
  layout = 'list',
  columns = 2,
  className,
  required = false,
}: CheckboxGroupProps) {
  const handleCheckedChange = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionId]);
    } else {
      onChange(value.filter((id) => id !== optionId));
    }
  };

  const gridClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </legend>

      {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}

      <div
        className={cn(
          'border rounded-lg p-4 bg-background',
          layout === 'grid' ? `grid gap-3 ${gridClasses[columns]}` : 'space-y-3'
        )}
      >
        {options.map((option) => (
          <div
            key={option.id}
            className={cn(
              'flex items-start space-x-3 p-2 rounded-lg transition-colors',
              !option.disabled && 'hover:bg-muted/50',
              option.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Checkbox
              id={option.id}
              checked={value.includes(option.id)}
              onCheckedChange={(checked) => handleCheckedChange(option.id, checked as boolean)}
              disabled={option.disabled}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <Label
                htmlFor={option.id}
                className={cn(
                  'text-sm font-medium cursor-pointer',
                  option.disabled && 'cursor-not-allowed'
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} of {options.length} selected
        </p>
      )}
    </fieldset>
  );
}

/**
 * CheckboxGroupGrid - Convenience wrapper for grid layout
 */
export function CheckboxGroupGrid(
  props: Omit<CheckboxGroupProps, 'layout'> & { columns?: 2 | 3 | 4 }
) {
  return <CheckboxGroup {...props} layout="grid" />;
}

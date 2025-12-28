import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  convertWeight,
  convertVolume,
  convertDistance,
  getUnitOptions,
  type WeightUnit,
  type VolumeUnit,
  type DistanceUnit,
  type UnitOption,
} from '@/lib/unitConversions';

type UnitType = 'weight' | 'volume' | 'distance';
type AllUnits = WeightUnit | VolumeUnit | DistanceUnit;

export interface UnitInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: AllUnits;
  onUnitChange?: (unit: AllUnits) => void;
  unitType: UnitType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
}

/**
 * UnitInput - Numerical input with integrated unit selection
 *
 * Allows users to enter values with unit conversion support.
 * The input automatically converts values when units are changed.
 *
 * @example
 * ```tsx
 * <UnitInput
 *   label="Weight"
 *   value={weight}
 *   onChange={setWeight}
 *   unit={weightUnit}
 *   onUnitChange={setWeightUnit}
 *   unitType="weight"
 * />
 * ```
 */
export function UnitInput({
  label,
  value,
  onChange,
  unit,
  onUnitChange,
  unitType,
  placeholder,
  min,
  max,
  step = 0.01,
  required = false,
  disabled = false,
  className,
  description,
}: UnitInputProps) {
  const [displayValue, setDisplayValue] = React.useState(value.toString());
  const availableUnits = getUnitOptions(unitType);

  // Update display value when prop value changes
  React.useEffect(() => {
    setDisplayValue(value.toFixed(2));
  }, [value]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    const parsed = parseFloat(newValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    if (!onUnitChange) return;

    let convertedValue = value;

    // Convert the current value to the new unit
    if (unitType === 'weight') {
      convertedValue = convertWeight(value, unit as WeightUnit, newUnit as WeightUnit);
    } else if (unitType === 'volume') {
      convertedValue = convertVolume(value, unit as VolumeUnit, newUnit as VolumeUnit);
    } else if (unitType === 'distance') {
      convertedValue = convertDistance(value, unit as DistanceUnit, newUnit as DistanceUnit);
    }

    onChange(convertedValue);
    onUnitChange(newUnit as AllUnits);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div className="relative flex gap-2">
        {/* Numerical Input */}
        <Input
          type="number"
          value={displayValue}
          onChange={handleValueChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          className="flex-1"
        />

        {/* Unit Selector */}
        {onUnitChange ? (
          <Select value={unit} onValueChange={handleUnitChange} disabled={disabled}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((unitOption) => (
                <SelectItem key={unitOption.value} value={unitOption.value}>
                  {unitOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm min-w-[4rem] justify-center">
            {availableUnits.find((u) => u.value === unit)?.label || unit}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * WeightInput - Convenience wrapper for weight inputs
 */
export interface WeightInputProps extends Omit<UnitInputProps, 'unitType'> {
  unit: WeightUnit;
  onUnitChange?: (unit: WeightUnit) => void;
}

export function WeightInput(props: WeightInputProps) {
  return <UnitInput {...props} unitType="weight" />;
}

/**
 * VolumeInput - Convenience wrapper for volume inputs
 */
export interface VolumeInputProps extends Omit<UnitInputProps, 'unitType'> {
  unit: VolumeUnit;
  onUnitChange?: (unit: VolumeUnit) => void;
}

export function VolumeInput(props: VolumeInputProps) {
  return <UnitInput {...props} unitType="volume" />;
}

/**
 * DistanceInput - Convenience wrapper for distance inputs
 */
export interface DistanceInputProps extends Omit<UnitInputProps, 'unitType'> {
  unit: DistanceUnit;
  onUnitChange?: (unit: DistanceUnit) => void;
}

export function DistanceInput(props: DistanceInputProps) {
  return <UnitInput {...props} unitType="distance" />;
}

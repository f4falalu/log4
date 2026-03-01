// MOD4 Damage Type Selector
// Displays selectable damage categories for vehicle hand-off requests

import { cn } from '@/lib/utils';
import { 
  Wrench, 
  Car, 
  CircleAlert, 
  Zap, 
  Fuel,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';

export interface DamageType {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DAMAGE_TYPES: DamageType[] = [
  {
    id: 'engine_failure',
    label: 'Engine Failure',
    description: 'Engine won\'t start or has stopped running',
    icon: Wrench
  },
  {
    id: 'collision',
    label: 'Collision / Accident',
    description: 'Vehicle involved in a collision or accident',
    icon: Car
  },
  {
    id: 'tire_blowout',
    label: 'Tire Blowout',
    description: 'Irreparable tire damage, no spare available',
    icon: CircleAlert
  },
  {
    id: 'electrical_failure',
    label: 'Electrical Failure',
    description: 'Electrical system malfunction or battery failure',
    icon: Zap
  },
  {
    id: 'fuel_issue',
    label: 'Fuel Issue',
    description: 'Out of fuel or fuel system problem',
    icon: Fuel
  },
  {
    id: 'other',
    label: 'Other Critical Issue',
    description: 'Any other issue preventing delivery',
    icon: HelpCircle
  }
];

interface DamageTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: DamageType) => void;
}

export function DamageTypeSelector({ selectedType, onSelect }: DamageTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {DAMAGE_TYPES.map((damage) => {
        const isSelected = selectedType === damage.id;
        const Icon = damage.icon;
        
        return (
          <button
            key={damage.id}
            onClick={() => onSelect(damage)}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200",
              "active:scale-[0.98] touch-target",
              isSelected 
                ? "border-destructive bg-destructive/20 ring-2 ring-offset-2 ring-offset-background ring-destructive/50"
                : "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
            )}
          >
            <Icon className={cn(
              "w-6 h-6 mb-2",
              isSelected ? "text-destructive" : "text-destructive/70"
            )} />
            <span className={cn(
              "font-medium text-sm text-left",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {damage.label}
            </span>
            <span className="text-xs text-muted-foreground text-left mt-0.5 line-clamp-2">
              {damage.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

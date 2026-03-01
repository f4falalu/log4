// MOD4 Issue Type Selector
// Displays selectable issue categories for support requests

import { cn } from '@/lib/utils';
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';

export interface IssueType {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const ISSUE_TYPES: IssueType[] = [
  {
    id: 'package_damaged',
    label: 'Package Damaged',
    description: 'Package is damaged or contents may be compromised',
    icon: Package,
    severity: 'high'
  },
  {
    id: 'vehicle_issue',
    label: 'Vehicle Problem',
    description: 'Vehicle breakdown, flat tire, or mechanical issue',
    icon: Truck,
    severity: 'critical'
  },
  {
    id: 'address_issue',
    label: 'Address Problem',
    description: 'Cannot locate address or access restricted',
    icon: MapPin,
    severity: 'medium'
  },
  {
    id: 'running_late',
    label: 'Running Late',
    description: 'Behind schedule due to traffic or delays',
    icon: Clock,
    severity: 'low'
  },
  {
    id: 'safety_concern',
    label: 'Safety Concern',
    description: 'Unsafe delivery location or situation',
    icon: ShieldAlert,
    severity: 'critical'
  },
  {
    id: 'customer_issue',
    label: 'Customer Issue',
    description: 'Customer complaint or refusal to accept',
    icon: AlertTriangle,
    severity: 'medium'
  },
  {
    id: 'other',
    label: 'Other Issue',
    description: 'Any other problem not listed above',
    icon: HelpCircle,
    severity: 'low'
  }
];

interface IssueTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: IssueType) => void;
}

const severityColors: Record<IssueType['severity'], string> = {
  low: 'border-muted-foreground/30 bg-muted/20',
  medium: 'border-warning/50 bg-warning/10',
  high: 'border-destructive/50 bg-destructive/10',
  critical: 'border-destructive bg-destructive/20'
};

const severitySelectedColors: Record<IssueType['severity'], string> = {
  low: 'border-primary bg-primary/10',
  medium: 'border-warning bg-warning/20',
  high: 'border-destructive bg-destructive/20',
  critical: 'border-destructive bg-destructive/30'
};

export function IssueTypeSelector({ selectedType, onSelect }: IssueTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ISSUE_TYPES.map((issue) => {
        const isSelected = selectedType === issue.id;
        const Icon = issue.icon;
        
        return (
          <button
            key={issue.id}
            onClick={() => onSelect(issue)}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200",
              "active:scale-[0.98] touch-target",
              isSelected 
                ? severitySelectedColors[issue.severity]
                : severityColors[issue.severity],
              isSelected && "ring-2 ring-offset-2 ring-offset-background ring-primary/50"
            )}
          >
            <Icon className={cn(
              "w-6 h-6 mb-2",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )} />
            <span className={cn(
              "font-medium text-sm text-left",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {issue.label}
            </span>
            <span className="text-xs text-muted-foreground text-left mt-0.5 line-clamp-2">
              {issue.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

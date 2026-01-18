/**
 * MapLegend.tsx
 *
 * Collapsible legend component for the Operational Map
 * Explains visual encodings: vehicle status colors, route types, trail meaning
 *
 * GOVERNANCE:
 * - Operators must be able to interpret the map without guessing
 * - Legend provides immediate reference for all visual encodings
 * - Collapsed by default to save space, expandable on demand
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Circle, Minus, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============================================================================
// LEGEND DATA
// ============================================================================

/**
 * Vehicle Status Legend Items
 */
const VEHICLE_STATUS_ITEMS = [
  { color: '#10b981', label: 'Available', description: 'Ready for assignment' },
  { color: '#fe7f2d', label: 'En Route', description: 'Currently on delivery' },
  { color: '#3b82f6', label: 'Delivering', description: 'At delivery location' },
  { color: '#ef4444', label: 'Delayed', description: 'Behind schedule' },
  { color: '#6b7280', label: 'Offline', description: 'Not reporting' },
];

/**
 * Route Status Legend Items
 */
const ROUTE_STATUS_ITEMS = [
  { color: '#9ca3af', label: 'Planned', style: 'dashed', description: 'Not yet started' },
  { color: '#fe7f2d', label: 'Active', style: 'solid', description: 'Currently in progress' },
  { color: '#10b981', label: 'Completed', style: 'faded', description: 'Delivery finished' },
];

/**
 * Entity Type Legend Items
 */
const ENTITY_TYPE_ITEMS = [
  { icon: 'truck', color: '#fe7f2d', label: 'Truck', size: 'large' },
  { icon: 'van', color: '#fe7f2d', label: 'Van', size: 'medium' },
  { icon: 'bike', color: '#fe7f2d', label: 'Bike', size: 'small' },
];

/**
 * Facility Type Legend Items
 */
const FACILITY_TYPE_ITEMS = [
  { color: '#ef4444', label: 'Hospital' },
  { color: '#3b82f6', label: 'Clinic' },
  { color: '#10b981', label: 'Pharmacy' },
  { color: '#a855f7', label: 'Health Center' },
  { color: '#06b6d4', label: 'Lab' },
];

// ============================================================================
// LEGEND SECTION COMPONENT
// ============================================================================

interface LegendSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function LegendSection({ title, children, defaultOpen = true }: LegendSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span>{title}</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 pb-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// LEGEND ITEM COMPONENTS
// ============================================================================

interface ColorDotItemProps {
  color: string;
  label: string;
  description?: string;
}

function ColorDotItem({ color, label, description }: ColorDotItemProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-foreground">{label}</span>
      {description && (
        <span className="text-muted-foreground text-[10px] hidden sm:inline">
          — {description}
        </span>
      )}
    </div>
  );
}

interface LineStyleItemProps {
  color: string;
  label: string;
  style: 'solid' | 'dashed' | 'faded';
  description?: string;
}

function LineStyleItem({ color, label, style, description }: LineStyleItemProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-6 h-0.5 shrink-0 relative">
        <div
          className={cn(
            'absolute inset-0',
            style === 'dashed' && 'border-t border-dashed',
            style === 'faded' && 'opacity-40'
          )}
          style={{
            backgroundColor: style !== 'dashed' ? color : 'transparent',
            borderColor: style === 'dashed' ? color : 'transparent',
          }}
        />
      </div>
      <span className="text-foreground">{label}</span>
      {description && (
        <span className="text-muted-foreground text-[10px] hidden sm:inline">
          — {description}
        </span>
      )}
    </div>
  );
}

interface VehicleSizeItemProps {
  size: 'small' | 'medium' | 'large';
  label: string;
  color: string;
}

function VehicleSizeItem({ size, label, color }: VehicleSizeItemProps) {
  const sizeMap = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-4 flex items-center justify-center">
        <div
          className={cn('rounded-full', sizeMap[size])}
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-foreground">{label}</span>
    </div>
  );
}

// ============================================================================
// MAIN LEGEND COMPONENT
// ============================================================================

export interface MapLegendProps {
  /** Position on the map */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** CSS class name */
  className?: string;
}

/**
 * MapLegend - Collapsible legend for the Operational Map
 *
 * Provides visual reference for:
 * - Vehicle status colors
 * - Vehicle type hierarchy (size)
 * - Route status styling
 * - Facility type colors
 * - Trail meaning
 */
export function MapLegend({
  position = 'bottom-left',
  defaultExpanded = false,
  className,
}: MapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Position classes
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  return (
    <div
      className={cn(
        'absolute z-[900] transition-all duration-200',
        positionClasses[position],
        className
      )}
    >
      <div
        className={cn(
          'bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg',
          'transition-all duration-200',
          isExpanded ? 'w-56' : 'w-auto'
        )}
      >
        {/* Header / Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full justify-between px-3 py-2 h-auto',
            !isExpanded && 'rounded-lg'
          )}
        >
          <span className="text-xs font-medium">Legend</span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 ml-2" />
          ) : (
            <ChevronUp className="h-3 w-3 ml-2" />
          )}
        </Button>

        {/* Legend Content */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
            {/* Vehicle Status */}
            <LegendSection title="Vehicle Status" defaultOpen={true}>
              {VEHICLE_STATUS_ITEMS.map((item) => (
                <ColorDotItem
                  key={item.label}
                  color={item.color}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </LegendSection>

            {/* Vehicle Types */}
            <LegendSection title="Vehicle Size" defaultOpen={false}>
              {ENTITY_TYPE_ITEMS.map((item) => (
                <VehicleSizeItem
                  key={item.label}
                  size={item.size as 'small' | 'medium' | 'large'}
                  label={item.label}
                  color={item.color}
                />
              ))}
              <p className="text-[10px] text-muted-foreground mt-1">
                Larger icon = larger vehicle
              </p>
            </LegendSection>

            {/* Route Status */}
            <LegendSection title="Route Status" defaultOpen={false}>
              {ROUTE_STATUS_ITEMS.map((item) => (
                <LineStyleItem
                  key={item.label}
                  color={item.color}
                  label={item.label}
                  style={item.style as 'solid' | 'dashed' | 'faded'}
                  description={item.description}
                />
              ))}
            </LegendSection>

            {/* Facility Types */}
            <LegendSection title="Facility Types" defaultOpen={false}>
              {FACILITY_TYPE_ITEMS.map((item) => (
                <ColorDotItem
                  key={item.label}
                  color={item.color}
                  label={item.label}
                />
              ))}
            </LegendSection>

            {/* Trail Explanation */}
            <LegendSection title="Trails" defaultOpen={false}>
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>Fading line behind each vehicle</p>
                <p>Shows recent movement history</p>
                <p>Strong = recent, faded = older</p>
              </div>
            </LegendSection>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapLegend;

import { motion } from 'framer-motion';
import { Warehouse, Building2, MapPin, Eye, EyeOff, Route, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FacilityType } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface FacilityTypeFilterProps {
  activeFilters: Set<FacilityType>;
  onFilterChange: (type: FacilityType) => void;
  onOptimizeRoute?: () => void;
  isOptimized?: boolean;
  className?: string;
}

const filterOptions: Array<{
  type: FacilityType;
  label: string;
  icon: typeof Warehouse;
  color: string;
  bgColor: string;
}> = [
  {
    type: 'warehouse',
    label: 'Warehouse',
    icon: Warehouse,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
  },
  {
    type: 'facility',
    label: 'Facility',
    icon: Building2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  {
    type: 'public',
    label: 'Public',
    icon: MapPin,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-muted-foreground/30',
  },
];

export function FacilityTypeFilter({
  activeFilters,
  onFilterChange,
  onOptimizeRoute,
  isOptimized = false,
  className,
}: FacilityTypeFilterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 p-2 rounded-xl bg-background/90 backdrop-blur-md border border-border shadow-lg',
        className
      )}
    >
      {/* Filter buttons */}
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeFilters.has(option.type);

        return (
          <button
            key={option.type}
            onClick={() => onFilterChange(option.type)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium',
              isActive
                ? option.bgColor
                : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary'
            )}
            title={`${isActive ? 'Hide' : 'Show'} ${option.label} locations`}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive && option.color)} />
            <span className={cn(isActive && option.color)}>{option.label}</span>
            {isActive ? (
              <Eye className="w-3 h-3 opacity-50" />
            ) : (
              <EyeOff className="w-3 h-3 opacity-30" />
            )}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Optimize Route button */}
      {onOptimizeRoute && (
        <Button
          size="sm"
          variant={isOptimized ? 'default' : 'outline'}
          className={cn(
            'h-8 gap-1.5 text-xs',
            isOptimized && 'bg-green-600 hover:bg-green-700'
          )}
          onClick={onOptimizeRoute}
        >
          {isOptimized ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Optimized
            </>
          ) : (
            <>
              <Route className="w-3.5 h-3.5" />
              Optimize
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}

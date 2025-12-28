import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, Search, MapPin, Layers, BookOpen, Pencil, Ruler, Focus } from 'lucide-react';
import { FLOATING_PANEL, Z_INDEX, BUTTON_SIZE, ICON_SIZE } from '@/lib/mapDesignSystem';
import { cn } from '@/lib/utils';
import L from 'leaflet';

interface MapToolbarClustersProps {
  map: L.Map | null;
  onLocateMe: () => void;
  onSearchClick: () => void;
  onServiceAreasClick: () => void;
  onLayersClick: () => void;
  onLegendClick?: () => void;
  onDrawToggle: () => void;
  onMeasureClick: () => void;
  isDrawing: boolean;
  isMeasuring: boolean;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ToolButton({ icon, label, onClick, active }: ToolButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              BUTTON_SIZE.icon,
              'rounded-full flex items-center justify-center transition-all duration-150',
              active
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'hover:bg-muted/50'
            )}
            aria-label={label}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MapToolbarClusters({
  map,
  onLocateMe,
  onSearchClick,
  onServiceAreasClick,
  onLayersClick,
  onLegendClick,
  onDrawToggle,
  onMeasureClick,
  isDrawing,
  isMeasuring,
}: MapToolbarClustersProps) {
  return (
    <div
      className="absolute top-24 left-4 flex flex-col gap-3"
      style={{ zIndex: Z_INDEX.toolbar }}
    >
      {/* Navigation Cluster */}
      <div className={cn(FLOATING_PANEL.toolbar, 'p-2 flex flex-col gap-2')}>
        <ToolButton
          icon={<Target size={ICON_SIZE.md} />}
          label="Locate Me"
          onClick={onLocateMe}
        />
        <ToolButton
          icon={<Search size={ICON_SIZE.md} />}
          label="Search"
          onClick={onSearchClick}
        />
      </div>

      {/* Layers Cluster */}
      <div className={cn(FLOATING_PANEL.toolbar, 'p-2 flex flex-col gap-2')}>
        <ToolButton
          icon={<MapPin size={ICON_SIZE.md} />}
          label="Service Areas"
          onClick={onServiceAreasClick}
        />
        <ToolButton
          icon={<Layers size={ICON_SIZE.md} />}
          label="Layers"
          onClick={onLayersClick}
        />
        {onLegendClick && (
          <ToolButton
            icon={<BookOpen size={ICON_SIZE.md} />}
            label="Legend"
            onClick={onLegendClick}
          />
        )}
      </div>

      {/* Tools Cluster */}
      <div className={cn(FLOATING_PANEL.toolbar, 'p-2 flex flex-col gap-2')}>
        <ToolButton
          icon={<Pencil size={ICON_SIZE.md} />}
          label="Draw"
          onClick={onDrawToggle}
          active={isDrawing}
        />
        <ToolButton
          icon={<Ruler size={ICON_SIZE.md} />}
          label="Measure"
          onClick={onMeasureClick}
          active={isMeasuring}
        />
        <ToolButton
          icon={<Focus size={ICON_SIZE.md} />}
          label="Focus Mode"
          onClick={() => {
            // Toggle focus mode - hide all UI except map
            console.log('Focus mode toggle');
          }}
        />
      </div>
    </div>
  );
}

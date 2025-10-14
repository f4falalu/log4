import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Target, 
  Map as MapIcon, 
  Search, 
  Edit3, 
  Layers,
  Ruler,
  Info
} from 'lucide-react';

interface MapToolsToolbarProps {
  onLocateMe: () => void;
  onServiceAreasClick: () => void;
  onSearchClick: () => void;
  onDrawToggle: () => void;
  onLayersClick: () => void;
  onMeasureClick: () => void;
  onLegendClick: () => void;
  isDrawing: boolean;
  isMeasuring?: boolean;
}

export function MapToolsToolbar({
  onLocateMe,
  onServiceAreasClick,
  onSearchClick,
  onDrawToggle,
  onLayersClick,
  onMeasureClick,
  onLegendClick,
  isDrawing,
  isMeasuring = false,
}: MapToolsToolbarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="absolute top-24 left-4 z-[1000] flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent"
              onClick={onLocateMe}
              aria-label="Locate me"
            >
              <Target className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Locate Me</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent"
              onClick={onServiceAreasClick}
              aria-label="Service areas"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Service Areas</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent"
              onClick={onSearchClick}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className={`h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent ${
                isDrawing ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={onDrawToggle}
              aria-label="Draw mode"
              aria-pressed={isDrawing}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Draw / Edit</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent"
              onClick={onLayersClick}
              aria-label="Layers"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Layers</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className={`h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent ${
                isMeasuring ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={onMeasureClick}
              aria-label="Measure distance"
              aria-pressed={isMeasuring}
            >
              <Ruler className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Measure Distance</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full bg-background/95 backdrop-blur hover:bg-accent"
              onClick={onLegendClick}
              aria-label="Legend"
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Legend</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import L from 'leaflet';
import { 
  Target, 
  Map as MapIcon, 
  Search, 
  Edit3, 
  Layers,
  Ruler,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface MapToolsToolbarProps {
  map: L.Map | null;
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
  map,
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
  const [focusMode, setFocusMode] = useState(false);
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);
  const [focusZoom, setFocusZoom] = useState<number | null>(null);

  const toggleFocusMode = useCallback(() => {
    if (!map) return;
    
    if (!focusMode) {
      // Enable focus mode
      const center = map.getCenter();
      const zoom = map.getZoom();
      
      setFocusCenter([center.lat, center.lng]);
      setFocusZoom(zoom);
      
      // Calculate 100m bounds (~0.001 degrees)
      const bounds = L.latLngBounds(
        [center.lat - 0.001, center.lng - 0.001],
        [center.lat + 0.001, center.lng + 0.001]
      );
      
      map.setMaxBounds(bounds);
      map.setMinZoom(zoom - 1);
      map.setMaxZoom(zoom + 1);
      map.scrollWheelZoom.disable();
      
      toast.info('🔒 Focus mode enabled - Map locked to current view');
    } else {
      // Disable focus mode
      map.setMaxBounds(null as any);
      map.setMinZoom(2);
      map.setMaxZoom(19);
      map.scrollWheelZoom.enable();
      
      toast.info('🔓 Focus mode disabled - Full navigation restored');
    }
    
    setFocusMode(!focusMode);
  }, [map, focusMode]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="absolute top-24 left-4 z-[1000] flex flex-col gap-3 bg-background/95 backdrop-blur rounded-lg shadow-lg border p-3">
        {/* Navigation Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full hover:bg-accent"
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
              className="h-10 w-10 rounded-full hover:bg-accent"
              onClick={onSearchClick}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Separator className="my-2" />

        {/* Layer Controls Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full hover:bg-accent"
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
              className="h-10 w-10 rounded-full hover:bg-accent"
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
              className="h-10 w-10 rounded-full hover:bg-accent"
              onClick={onLegendClick}
              aria-label="Legend"
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Legend</TooltipContent>
        </Tooltip>

        <Separator className="my-2" />

        {/* Tools Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className={`h-10 w-10 rounded-full hover:bg-accent ${
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
              className={`h-10 w-10 rounded-full hover:bg-accent ${
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

        <Separator className="my-2" />

        {/* View Controls Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className={`h-10 w-10 rounded-full hover:bg-accent ${
                focusMode ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={toggleFocusMode}
              aria-label="Focus mode"
              aria-pressed={focusMode}
            >
              {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Focus Mode {focusMode ? '(Active)' : '(Off)'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

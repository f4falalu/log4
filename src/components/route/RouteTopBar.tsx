import { ChevronLeft, Layers, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RouteTopBarProps {
  onBack?: () => void;
  onLayerChange?: (layer: string) => void;
  currentLayer?: string;
  title?: string;
}

export function RouteTopBar({
  onBack,
  onLayerChange,
  currentLayer = 'default',
  title = 'Route',
}: RouteTopBarProps) {
  const layers = [
    { id: 'default', label: 'Default' },
    { id: 'satellite', label: 'Satellite' },
    { id: 'terrain', label: 'Terrain' },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-background/90 to-transparent backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
        onClick={onBack}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
          >
            <Layers className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {layers.map((layer) => (
            <DropdownMenuItem
              key={layer.id}
              onClick={() => onLayerChange?.(layer.id)}
              className={currentLayer === layer.id ? 'bg-accent' : ''}
            >
              {layer.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

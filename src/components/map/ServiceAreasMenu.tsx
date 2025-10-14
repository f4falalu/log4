import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Eye, 
  EyeOff, 
  Target, 
  Edit2, 
  Trash2, 
  Plus,
  Search 
} from 'lucide-react';
import { ServiceZone } from '@/types/zones';

interface ServiceAreasMenuProps {
  zones: ServiceZone[];
  visibleZones: Set<string>;
  selectedZoneId: string | null;
  onToggleVisibility: (zoneId: string) => void;
  onCenterOnZone: (zoneId: string) => void;
  onEditZone: (zoneId: string) => void;
  onDeleteZone: (zoneId: string) => void;
  onCreateNew: () => void;
  children: React.ReactNode;
}

export function ServiceAreasMenu({
  zones,
  visibleZones,
  selectedZoneId,
  onToggleVisibility,
  onCenterOnZone,
  onEditZone,
  onDeleteZone,
  onCreateNew,
  children,
}: ServiceAreasMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0" 
        side="right" 
        align="start"
        sideOffset={12}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Service Areas</h4>
            <Button
              size="sm"
              onClick={onCreateNew}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {filteredZones.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {searchQuery ? 'No zones found' : 'No service areas yet'}
              </div>
            ) : (
              filteredZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`group flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors ${
                    selectedZoneId === zone.id ? 'bg-accent' : ''
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="flex-1 text-sm truncate">{zone.name}</span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onToggleVisibility(zone.id)}
                      aria-label={visibleZones.has(zone.id) ? 'Hide zone' : 'Show zone'}
                    >
                      {visibleZones.has(zone.id) ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onCenterOnZone(zone.id)}
                      aria-label="Center on map"
                    >
                      <Target className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onEditZone(zone.id)}
                      aria-label="Edit zone"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDeleteZone(zone.id)}
                      aria-label="Delete zone"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

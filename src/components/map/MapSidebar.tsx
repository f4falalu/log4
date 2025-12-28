import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ServiceZone } from '@/types/zones';
import { Layers, Radio, MapPin, AlertTriangle } from 'lucide-react';

export interface LayerFilters {
  facilities: boolean;
  warehouses: boolean;
  drivers: boolean;
  zones: boolean;
  alerts: boolean;
  routes: boolean;
  payload: boolean;
}

export interface RealtimeEvent {
  id: string;
  type: 'handoff' | 'zone_entry' | 'zone_exit' | 'delivery_complete' | 'alert';
  timestamp: string;
  title: string;
  description: string;
}

interface MapSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  zones?: ServiceZone[];
  events?: RealtimeEvent[];
  filters?: LayerFilters;
  onFilterChange?: (filters: LayerFilters) => void;
  onZoneCreate?: () => void;
  onZoneEdit?: (zoneId: string) => void;
  onZoneDelete?: (zoneId: string) => void;
  children?: ReactNode;
}

const defaultFilters: LayerFilters = {
  facilities: true,
  warehouses: true,
  drivers: true,
  zones: true,
  alerts: true,
  routes: true,
  payload: false,
};

/**
 * MapSidebar - Collapsible side panel for map controls
 * Provides layer filters, event stream, and zone management
 */
export function MapSidebar({
  open = false,
  onOpenChange,
  zones = [],
  events = [],
  filters = defaultFilters,
  onFilterChange,
  onZoneCreate,
  onZoneEdit,
  onZoneDelete,
  children,
}: MapSidebarProps) {
  
  const handleFilterToggle = (layer: keyof LayerFilters) => {
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        [layer]: !filters[layer],
      });
    }
  };

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'zone_entry':
      case 'zone_exit':
        return <MapPin className="w-4 h-4" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'handoff':
        return <Radio className="w-4 h-4 text-primary" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'zone_entry':
        return 'bg-primary/10 border-primary/20';
      case 'zone_exit':
        return 'bg-warning/10 border-warning/20';
      case 'alert':
        return 'bg-warning/10 border-warning/20';
      case 'handoff':
        return 'bg-primary/10 border-primary/20';
      case 'delivery_complete':
        return 'bg-success/10 border-success/20';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Map Controls
          </SheetTitle>
          <SheetDescription>
            Manage layers, events, and service zones
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-6">
            <Accordion type="multiple" defaultValue={["filters", "events", "zones"]} className="space-y-4">
              
              {/* Layer Filters Section */}
              <AccordionItem value="filters" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span className="font-semibold">Layer Filters</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-facilities" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Facilities
                      </Label>
                      <Checkbox
                        id="filter-facilities"
                        checked={filters.facilities}
                        onCheckedChange={() => handleFilterToggle('facilities')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-warehouses" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Warehouses
                      </Label>
                      <Checkbox
                        id="filter-warehouses"
                        checked={filters.warehouses}
                        onCheckedChange={() => handleFilterToggle('warehouses')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-drivers" className="text-sm cursor-pointer flex items-center gap-2">
                        <Radio className="w-3 h-3" />
                        Drivers
                      </Label>
                      <Checkbox
                        id="filter-drivers"
                        checked={filters.drivers}
                        onCheckedChange={() => handleFilterToggle('drivers')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-zones" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Service Zones
                      </Label>
                      <Checkbox
                        id="filter-zones"
                        checked={filters.zones}
                        onCheckedChange={() => handleFilterToggle('zones')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-alerts" className="text-sm cursor-pointer flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Zone Alerts
                      </Label>
                      <Checkbox
                        id="filter-alerts"
                        checked={filters.alerts}
                        onCheckedChange={() => handleFilterToggle('alerts')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-routes" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Routes
                      </Label>
                      <Checkbox
                        id="filter-routes"
                        checked={filters.routes}
                        onCheckedChange={() => handleFilterToggle('routes')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filter-payload" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Payload Heatmap
                      </Label>
                      <Checkbox
                        id="filter-payload"
                        checked={filters.payload}
                        onCheckedChange={() => handleFilterToggle('payload')}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Event Stream Section */}
              <AccordionItem value="events" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span className="font-semibold">Event Stream</span>
                    {events.length > 0 && (
                      <Badge variant="secondary" className="ml-auto mr-2">
                        {events.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {events.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent events</p>
                      </div>
                    ) : (
                      events.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                        >
                          <div className="flex items-start gap-2">
                            {getEventIcon(event.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Zone Manager Section */}
              <AccordionItem value="zones" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-semibold">Zone Manager</span>
                    {zones.length > 0 && (
                      <Badge variant="secondary" className="ml-auto mr-2">
                        {zones.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {onZoneCreate && (
                      <>
                        <Button 
                          onClick={onZoneCreate} 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                        >
                          + Create New Zone
                        </Button>
                        <Separator />
                      </>
                    )}
                    
                    {zones.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No service zones</p>
                        <p className="text-xs">Create zones to manage coverage areas</p>
                      </div>
                    ) : (
                      zones.map((zone) => (
                        <div
                          key={zone.id}
                          className="p-3 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: zone.color }}
                                />
                                <p className="text-sm font-medium truncate">{zone.name}</p>
                              </div>
                              {zone.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {zone.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {onZoneEdit && (
                                <Button
                                  onClick={() => onZoneEdit(zone.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  ✎
                                </Button>
                              )}
                              {onZoneDelete && (
                                <Button
                                  onClick={() => onZoneDelete(zone.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Custom Children Content */}
            {children}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

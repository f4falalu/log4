import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useServiceZones } from '@/hooks/useServiceZones';

export function MapToolsPanel() {
  const { data: zones = [] } = useServiceZones();

  return (
    <div className="h-full p-4">
      <Tabs defaultValue="zones" className="h-full">
        <TabsList className="w-full">
          <TabsTrigger value="zones" className="flex-1">Service Zones</TabsTrigger>
          <TabsTrigger value="geofence" className="flex-1">Geofencing</TabsTrigger>
          <TabsTrigger value="network" className="flex-1">Facility Network</TabsTrigger>
          <TabsTrigger value="calculate" className="flex-1">Distance Calc</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="h-[calc(100%-40px)]">
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Manage Service Areas</h3>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Zone
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {zones.map((zone: any) => (
                  <div
                    key={zone.id}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{zone.name}</h4>
                          <Badge
                            variant={zone.is_active ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {zone.description && (
                          <p className="text-xs text-muted-foreground">{zone.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={zone.is_active ? "Hide zone" : "Show zone"}
                        >
                          {zone.is_active ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Edit zone"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete zone"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="geofence" className="h-[calc(100%-40px)]">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground mb-4">
              <div className="text-sm font-medium mb-2">Geofencing Tools</div>
              <p className="text-xs">
                Create circular or polygon geofences to monitor vehicle entry/exit events
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Geofence
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="network" className="h-[calc(100%-40px)]">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground mb-4">
              <div className="text-sm font-medium mb-2">Facility Network Graph</div>
              <p className="text-xs">
                Visualize delivery connections between facilities
              </p>
            </div>
            <Button size="sm" variant="outline">
              Generate Graph
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="calculate" className="h-[calc(100%-40px)]">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground mb-4">
              <div className="text-sm font-medium mb-2">Distance Calculator</div>
              <p className="text-xs">
                Click two points on the map to calculate road distance
              </p>
            </div>
            <Button size="sm" variant="outline">
              Start Calculation
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

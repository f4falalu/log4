import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MapPin, Navigation } from 'lucide-react';
import { Driver } from '@/types';

interface BottomDataPanelProps {
  drivers: Driver[];
  onDriverClick: (driverId: string) => void;
}

export function BottomDataPanel({ drivers, onDriverClick }: BottomDataPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Driver['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: Driver['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-60 bg-background/95 backdrop-blur border-t z-[1000]">
      <Tabs defaultValue="drivers" className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <TabsList>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <TabsContent value="drivers" className="flex-1 mt-0 px-4 pb-4">
          <ScrollArea className="h-[160px]">
            <div className="space-y-2">
              {filteredDrivers.map((driver) => {
                const initials = driver.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={driver.id}
                    onClick={() => onDriverClick(driver.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{driver.name}</p>
                        <Badge
                          variant="secondary"
                          className={`h-5 text-xs ${getStatusColor(driver.status)} text-white`}
                        >
                          {getStatusLabel(driver.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {driver.currentLocation ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span>
                              {driver.currentLocation.lat.toFixed(4)}, {driver.currentLocation.lng.toFixed(4)}
                            </span>
                          </>
                        ) : (
                          <span>Location unknown</span>
                        )}
                      </div>
                    </div>

                    {driver.status === 'busy' && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        <span>En route</span>
                      </div>
                    )}

                    {driver.locationUpdatedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(driver.locationUpdatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredDrivers.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? 'No drivers found' : 'No drivers available'}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="vehicles" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            Vehicle tracking coming soon
          </div>
        </TabsContent>

        <TabsContent value="places" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            Places view coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MapPin, Navigation, Truck, Battery, Package, Warehouse } from 'lucide-react';
import { Driver, Facility, Warehouse as WarehouseType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BottomDataPanelProps {
  drivers: Driver[];
  vehicles?: any[];
  facilities?: Facility[];
  warehouses?: WarehouseType[];
  onDriverClick: (driverId: string) => void;
  onVehicleClick?: (vehicleId: string) => void;
  onFacilityClick?: (facilityId: string) => void;
}

export function BottomDataPanel({ 
  drivers, 
  vehicles = [],
  facilities = [],
  warehouses = [],
  onDriverClick,
  onVehicleClick,
  onFacilityClick
}: BottomDataPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [placesFilter, setPlacesFilter] = useState<'all' | 'facilities' | 'warehouses'>('all');

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allPlaces = [
    ...facilities.map(f => ({ ...f, type: 'facility' as const })),
    ...warehouses.map(w => ({ ...w, type: 'warehouse' as const }))
  ];

  const filteredPlaces = allPlaces
    .filter(place => {
      const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        placesFilter === 'all' || 
        (placesFilter === 'facilities' && place.type === 'facility') ||
        (placesFilter === 'warehouses' && place.type === 'warehouse');
      return matchesSearch && matchesFilter;
    });

  const getStatusColor = (status: Driver['status']) => {
    switch (status) {
      case 'available':
        return 'bg-success';
      case 'busy':
        return 'bg-warning';
      case 'offline':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const getStatusLabel = (status: Driver['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-60 bg-background border-t border-border shadow-lg z-floating">
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
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Navigation className="h-3 w-3" />
                          <span>En route</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ETA: ~{Math.floor(Math.random() * 30 + 10)} min
                        </div>
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
          <ScrollArea className="h-[160px]">
            <div className="space-y-2">
              {filteredVehicles.map((vehicle) => {
                const utilizationPct = vehicle.payload 
                  ? Math.round((vehicle.payload.currentWeight / vehicle.capacity) * 100)
                  : 0;
                
                return (
                  <div
                    key={vehicle.id}
                    onClick={() => onVehicleClick?.(vehicle.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{vehicle.model}</p>
                        <Badge variant="outline" className="h-5 text-xs">
                          {vehicle.plateNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>Payload: {utilizationPct}% ({vehicle.payload?.currentWeight || 0}kg)</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      {vehicle.currentDriverId && (
                        <Badge variant="secondary" className="h-5 text-xs">
                          Assigned
                        </Badge>
                      )}
                      {vehicle.status && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {vehicle.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredVehicles.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? 'No vehicles found' : 'No vehicles available'}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="places" className="flex-1 mt-0 px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <Select value={placesFilter} onValueChange={(v: any) => setPlacesFilter(v)}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Places</SelectItem>
                <SelectItem value="facilities">Facilities Only</SelectItem>
                <SelectItem value="warehouses">Warehouses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ScrollArea className="h-[128px]">
            <div className="space-y-2">
              {filteredPlaces.map((place) => {
                const Icon = place.type === 'warehouse' ? Warehouse : MapPin;
                
                return (
                  <div
                    key={place.id}
                    onClick={() => onFacilityClick?.(place.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      place.type === 'warehouse' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        place.type === 'warehouse' ? 'text-purple-500' : 'text-blue-500'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{place.name}</p>
                        <Badge 
                          variant="outline" 
                          className="h-5 text-xs capitalize"
                        >
                          {place.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {place.address || `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}

              {filteredPlaces.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchQuery ? 'No places found' : 'No places available'}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

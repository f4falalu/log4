import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Users,
  Battery,
  Clock,
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DispatcherMap, type DriverMarker } from '@/components/mod4/DispatcherMap';

interface ActiveDriver {
  driver_id: string;
  driver_name: string;
  session_id: string;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  current_lat: number | null;
  current_lng: number | null;
  heading: number | null;
  speed_mps: number | null;
  last_update: string | null;
  current_batch_id: string | null;
  batch_name: string | null;
  session_started_at: string;
  battery_level: number | null;
}

export default function DispatcherTrackingPage() {
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchActiveDrivers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_drivers_with_positions');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Failed to fetch active drivers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveDrivers();

    // Set up real-time subscription for driver updates
    const channel = supabase
      .channel('driver_positions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_gps_events',
        },
        () => {
          // Refresh driver list on GPS updates
          fetchActiveDrivers();
        }
      )
      .subscribe();

    // Poll every 30 seconds as backup
    const interval = setInterval(fetchActiveDrivers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveDrivers();
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-muted-foreground';
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-amber-500';
    return 'text-red-500';
  };

  const formatSpeed = (speedMps: number | null) => {
    if (speedMps === null) return '--';
    const kmh = speedMps * 3.6;
    return `${Math.round(kmh)} km/h`;
  };

  if (loading) {
    return (
      <div className="flex h-full">
        {/* Sidebar skeleton */}
        <div className="w-80 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        {/* Map skeleton */}
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Driver List Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Active Drivers</h2>
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} online
          </p>
        </div>

        <ScrollArea className="flex-1">
          {drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-center">No active drivers</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                No drivers are currently online with active sessions
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {drivers.map((driver) => (
                <Card
                  key={driver.driver_id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedDriver === driver.driver_id
                      ? 'border-primary bg-muted/50'
                      : 'hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedDriver(driver.driver_id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{driver.driver_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {driver.vehicle_plate || 'No vehicle'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        <span>{formatSpeed(driver.speed_mps)}</span>
                      </div>
                      <div className={cn('flex items-center gap-1', getBatteryColor(driver.battery_level))}>
                        <Battery className="h-3 w-3" />
                        <span>{driver.battery_level !== null ? `${driver.battery_level}%` : '--'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {driver.last_update
                            ? formatDistanceToNow(new Date(driver.last_update), { addSuffix: true })
                            : 'No recent update'}
                        </span>
                      </div>
                    </div>

                    {driver.batch_name && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {driver.batch_name}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {drivers.length > 0 ? (
          <DispatcherMap
            drivers={drivers.map(d => ({
              driver_id: d.driver_id,
              driver_name: d.driver_name,
              lat: d.current_lat || 0,
              lng: d.current_lng || 0,
              heading: d.heading || undefined,
              speed_mps: d.speed_mps || undefined,
              battery_level: d.battery_level || undefined,
              vehicle_plate: d.vehicle_plate || undefined,
              last_update: d.last_update || undefined,
            }))}
            selectedDriverId={selectedDriver}
            onDriverClick={(driverId) => setSelectedDriver(driverId)}
            height="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/20">
            <Card className="max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>Live Tracking Map</CardTitle>
                <CardDescription>
                  No active drivers to track
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Driver positions will appear on the map once GPS tracking is active
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

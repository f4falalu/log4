import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Phone,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchProgressTrackerProps {
  batch: any;
}

export function BatchProgressTracker({ batch }: BatchProgressTrackerProps) {
  const [liveData, setLiveData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);

  // Simulate real-time tracking data
  useEffect(() => {
    if (batch.status !== 'in-progress') return;

    // Set up real-time subscription for batch updates
    const channel = supabase
      .channel(`batch-tracking-${batch.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'batch_stops',
          filter: `batch_id=eq.${batch.id}`
        },
        (payload) => {
          console.log('Batch stop update:', payload);
          setLastUpdate(new Date());
          toast.info('Stop status updated');
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'delivery_batches',
          filter: `id=eq.${batch.id}`
        },
        (payload) => {
          console.log('Batch update:', payload);
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Simulate live tracking data updates
    const interval = setInterval(() => {
      if (batch.status === 'in-progress') {
        // Simulate GPS coordinates, speed, etc.
        setLiveData({
          currentLocation: {
            lat: 6.5244 + (Math.random() - 0.5) * 0.01,
            lng: 3.3792 + (Math.random() - 0.5) * 0.01,
            address: 'En route to next destination'
          },
          speed: Math.floor(Math.random() * 60) + 20, // 20-80 km/h
          heading: Math.floor(Math.random() * 360),
          lastGpsUpdate: new Date(),
          nextStop: batch.stops?.find((stop: any) => 
            ['pending', 'en_route'].includes(stop.status)
          ),
          estimatedArrival: new Date(Date.now() + Math.random() * 3600000), // Random ETA within 1 hour
          fuelLevel: Math.floor(Math.random() * 40) + 60, // 60-100%
          engineStatus: 'running',
          driverStatus: 'active'
        });
        setLastUpdate(new Date());
      }
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [batch.id, batch.status]);

  const completedStops = batch.stops?.filter((stop: any) => stop.status === 'completed').length || 0;
  const totalStops = batch.stops?.length || 0;
  const progressPercentage = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  const getConnectionStatus = () => {
    if (batch.status !== 'in-progress') {
      return { color: 'text-gray-500', text: 'Not Active', icon: Clock };
    }
    if (isConnected && liveData) {
      return { color: 'text-green-600', text: 'Live', icon: CheckCircle };
    }
    return { color: 'text-red-600', text: 'Disconnected', icon: AlertTriangle };
  };

  const connectionStatus = getConnectionStatus();

  if (batch.status !== 'in-progress') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Live Tracking
          </CardTitle>
          <CardDescription>
            Real-time tracking is only available for batches in progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Batch Not Active</p>
            <p className="text-sm">
              {batch.status === 'planned' 
                ? 'Start the batch to enable live tracking'
                : 'Batch has been completed'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Live Tracking
            </div>
            <div className="flex items-center gap-2">
              <connectionStatus.icon className={`h-4 w-4 ${connectionStatus.color}`} />
              <span className={`text-sm font-medium ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Real-time tracking via GPS and cellular connection
            </div>
            <Button variant="outline" size="sm" onClick={() => setLastUpdate(new Date())}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Route Completion</span>
            <span className="text-sm text-muted-foreground">
              {completedStops} of {totalStops} stops completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="text-center text-sm text-muted-foreground">
            {progressPercentage.toFixed(0)}% Complete
          </div>
        </CardContent>
      </Card>

      {/* Live Vehicle Data */}
      {liveData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Speed:</span>
                  <p className="font-medium">{liveData.speed} km/h</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Heading:</span>
                  <p className="font-medium">{liveData.heading}°</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Fuel Level:</span>
                  <p className="font-medium">{liveData.fuelLevel}%</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Engine:</span>
                  <p className="font-medium capitalize">{liveData.engineStatus}</p>
                </div>
              </div>

              <Separator />

              <div>
                <span className="text-sm text-muted-foreground">Current Location:</span>
                <p className="font-medium">{liveData.currentLocation.address}</p>
                <p className="text-sm text-muted-foreground">
                  {liveData.currentLocation.lat.toFixed(6)}, {liveData.currentLocation.lng.toFixed(6)}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Last GPS Update:</span>
                <p className="font-medium">{liveData.lastGpsUpdate.toLocaleTimeString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Next Stop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveData.nextStop ? (
                <>
                  <div>
                    <p className="font-medium">{liveData.nextStop.facility?.name}</p>
                    <p className="text-sm text-muted-foreground">{liveData.nextStop.facility?.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Stop Type:</span>
                      <p className="font-medium capitalize">{liveData.nextStop.stop_type}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Sequence:</span>
                      <p className="font-medium">#{liveData.nextStop.stop_sequence}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Estimated Arrival:</span>
                    <p className="font-medium">{liveData.estimatedArrival.toLocaleTimeString()}</p>
                  </div>

                  <Badge className={
                    liveData.nextStop.status === 'en_route' 
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }>
                    {liveData.nextStop.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>All stops completed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Driver Communication */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Communication</CardTitle>
          <CardDescription>
            Contact the driver for updates or instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{batch.driver?.name || 'No driver assigned'}</p>
              {batch.driver?.phone && (
                <p className="text-sm text-muted-foreground">{batch.driver.phone}</p>
              )}
              {liveData && (
                <Badge variant="outline" className="mt-1">
                  {liveData.driverStatus.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {batch.driver?.phone && (
                <>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and events for this batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Batch started</p>
                <p className="text-xs text-muted-foreground">
                  {batch.actual_start_time 
                    ? new Date(batch.actual_start_time).toLocaleString()
                    : 'Just now'
                  }
                </p>
              </div>
            </div>

            {batch.stops?.filter((stop: any) => stop.actual_arrival).map((stop: any) => (
              <div key={stop.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Arrived at {stop.facility?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(stop.actual_arrival).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            <div className="text-center py-4 text-muted-foreground">
              <div className="text-sm">Live updates will appear here as the batch progresses</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

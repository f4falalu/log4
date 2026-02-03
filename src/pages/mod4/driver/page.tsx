import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Trip {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  facilityCount: number;
  itemCount: number;
  estimatedDuration: string;
  startLocation?: string;
}

export default function DriverTripsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

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

  // Fetch driver ID for current user
  useEffect(() => {
    async function fetchDriverId() {
      if (!user) return;

      try {
        // Check mod4_driver_links for user-to-driver mapping
        const { data: link } = await supabase
          .from('mod4_driver_links')
          .select('driver_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (link?.driver_id) {
          setDriverId(link.driver_id);
        }
      } catch (error) {
        console.error('Failed to fetch driver link:', error);
      }
    }

    fetchDriverId();
  }, [user]);

  useEffect(() => {
    async function fetchTrips() {
      try {
        // Build query - filter by assigned driver if we have one
        let query = supabase
          .from('delivery_batches')
          .select(`
            id,
            name,
            status,
            delivery_date,
            assigned_driver_id,
            warehouse:warehouses(name),
            facilities:delivery_batch_facilities(count)
          `)
          .in('status', ['assigned', 'in-progress', 'ready', 'scheduled'])
          .order('delivery_date', { ascending: true })
          .limit(20);

        // Filter by driver if available
        if (driverId) {
          query = query.eq('assigned_driver_id', driverId);
        }

        const { data: batches, error } = await query;

        if (error) throw error;

        const mappedTrips: Trip[] = (batches || []).map((batch: any) => {
          let tripStatus: Trip['status'] = 'pending';
          if (batch.status === 'in-progress') {
            tripStatus = 'in_progress';
          } else if (batch.status === 'completed') {
            tripStatus = 'completed';
          }

          return {
            id: batch.id,
            name: batch.name || `Batch ${batch.id.slice(0, 8)}`,
            status: tripStatus,
            facilityCount: batch.facilities?.[0]?.count || 0,
            itemCount: 0,
            estimatedDuration: '~2 hrs',
            startLocation: batch.warehouse?.name || 'Warehouse',
          };
        });

        setTrips(mappedTrips);
      } catch (error) {
        console.error('Failed to fetch trips:', error);
        // Load from local storage if offline
        const cached = localStorage.getItem('mod4_trips');
        if (cached) {
          setTrips(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTrips();
  }, [driverId]);

  // Cache trips for offline access
  useEffect(() => {
    if (trips.length > 0) {
      localStorage.setItem('mod4_trips', JSON.stringify(trips));
    }
  }, [trips]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Re-fetch trips
      const query = supabase
        .from('delivery_batches')
        .select(`
          id,
          name,
          status,
          delivery_date,
          assigned_driver_id,
          warehouse:warehouses(name),
          facilities:delivery_batch_facilities(count)
        `)
        .in('status', ['assigned', 'in-progress', 'ready', 'scheduled'])
        .order('delivery_date', { ascending: true })
        .limit(20);

      if (driverId) {
        query.eq('assigned_driver_id', driverId);
      }

      const { data: batches } = await query;

      if (batches) {
        const mappedTrips: Trip[] = batches.map((batch: any) => {
          let tripStatus: Trip['status'] = 'pending';
          if (batch.status === 'in-progress') {
            tripStatus = 'in_progress';
          } else if (batch.status === 'completed') {
            tripStatus = 'completed';
          }

          return {
            id: batch.id,
            name: batch.name || `Batch ${batch.id.slice(0, 8)}`,
            status: tripStatus,
            facilityCount: batch.facilities?.[0]?.count || 0,
            itemCount: 0,
            estimatedDuration: '~2 hrs',
            startLocation: batch.warehouse?.name || 'Warehouse',
          };
        });
        setTrips(mappedTrips);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleStartTrip = (tripId: string) => {
    navigate(`/mod4/driver/delivery/${tripId}`);
  };

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600">Completed</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Trips</h1>
          <p className="text-muted-foreground">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'} assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isOnline ? 'default' : 'secondary'}
            className="flex items-center gap-1.5"
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || !isOnline}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', syncing && 'animate-spin')} />
            Sync
          </Button>
        </div>
      </div>

      {/* Trips List */}
      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No trips assigned</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              You don't have any trips assigned yet.<br />
              Check back later or contact your dispatcher.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{trip.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.startLocation || 'Starting point'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(trip.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.facilityCount} stops</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    <span>{trip.itemCount} items</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{trip.estimatedDuration}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {trip.status === 'pending' && (
                    <Button
                      className="flex-1"
                      onClick={() => handleStartTrip(trip.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Trip
                    </Button>
                  )}
                  {trip.status === 'in_progress' && (
                    <Button
                      className="flex-1"
                      onClick={() => handleStartTrip(trip.id)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  )}
                  {trip.status === 'completed' && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleStartTrip(trip.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      View Summary
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                You're offline
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Changes will sync when you're back online
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

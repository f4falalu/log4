import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  MapPin,
  CheckCircle2,
  Circle,
  Navigation,
  ArrowRight,
  Camera,
  PenTool,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DeliveryStop {
  id: string;
  facility_name: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  items_count: number;
}

interface BatchDetails {
  id: string;
  name: string;
  status: string;
  delivery_date: string;
  stops: DeliveryStop[];
}

export default function DeliveryExecutionPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentStop, setCurrentStop] = useState<number>(0);

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

  useEffect(() => {
    async function fetchBatchDetails() {
      if (!batchId) return;

      try {
        const { data: batchData, error: batchError } = await supabase
          .from('delivery_batches')
          .select(`
            id,
            name,
            status,
            delivery_date
          `)
          .eq('id', batchId)
          .single();

        if (batchError) throw batchError;

        // Fetch facilities for this batch
        const { data: facilities, error: facilityError } = await supabase
          .from('batch_facilities')
          .select(`
            id,
            facility:facilities(
              id,
              name,
              address
            )
          `)
          .eq('batch_id', batchId);

        if (facilityError) throw facilityError;

        const stops: DeliveryStop[] = (facilities || []).map((bf: any, index: number) => ({
          id: bf.id,
          facility_name: bf.facility?.name || 'Unknown Facility',
          address: bf.facility?.address || '',
          status: index === 0 ? 'in_progress' : 'pending',
          items_count: 0, // Will be populated when batch_items integration is complete
        }));

        setBatch({
          id: batchData.id,
          name: batchData.name,
          status: batchData.status,
          delivery_date: batchData.delivery_date,
          stops,
        });
      } catch (error) {
        console.error('Failed to fetch batch details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBatchDetails();
  }, [batchId]);

  const handleCompleteStop = (stopIndex: number) => {
    if (!batch) return;

    const updatedStops = [...batch.stops];
    updatedStops[stopIndex].status = 'completed';

    // Move to next stop if available
    if (stopIndex + 1 < batch.stops.length) {
      updatedStops[stopIndex + 1].status = 'in_progress';
      setCurrentStop(stopIndex + 1);
    }

    setBatch({ ...batch, stops: updatedStops });

    // TODO: Persist to database via mod4_events
  };

  const handleNavigate = (stopIndex: number) => {
    const stop = batch?.stops[stopIndex];
    if (!stop) return;

    // Open in maps app (works on mobile)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address || stop.facility_name)}`;
    window.open(mapsUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Batch Not Found</CardTitle>
            <CardDescription>
              The requested delivery batch could not be found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/mod4/driver')}
            >
              Back to My Trips
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedStops = batch.stops.filter(s => s.status === 'completed').length;
  const progressPercent = (completedStops / batch.stops.length) * 100;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{batch.name}</h1>
          <p className="text-muted-foreground">
            {completedStops} of {batch.stops.length} stops completed
          </p>
        </div>
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
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Delivery Progress</CardTitle>
            <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Stops List */}
      <div className="space-y-3">
        {batch.stops.map((stop, index) => {
          const isCompleted = stop.status === 'completed';
          const isCurrent = stop.status === 'in_progress';
          const isPending = stop.status === 'pending';

          return (
            <Card
              key={stop.id}
              className={cn(
                'overflow-hidden transition-all',
                isCurrent && 'border-primary shadow-sm',
                isCompleted && 'bg-muted/30'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-1 rounded-full p-1',
                    isCompleted && 'bg-green-100 text-green-600 dark:bg-green-900/20',
                    isCurrent && 'bg-primary/10 text-primary',
                    isPending && 'bg-muted text-muted-foreground'
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{stop.facility_name}</h3>
                      {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                      {isCompleted && <Badge variant="outline" className="text-xs text-green-600">Done</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {stop.address || 'Address not specified'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stop.items_count} items to deliver
                    </p>
                  </div>
                </div>
              </CardHeader>

              {isCurrent && (
                <CardContent className="space-y-3">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate(index)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Navigate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Photo
                    </Button>
                  </div>

                  {/* Delivery Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Capture Signature
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => handleCompleteStop(index)}
                    >
                      Complete Stop
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>

                  {!isOnline && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Data will sync when back online
                    </div>
                  )}
                </CardContent>
              )}

              {isCompleted && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Delivery completed
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Complete Batch Button */}
      {completedStops === batch.stops.length && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  All Stops Completed!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You've completed all deliveries for this batch
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate('/mod4/driver')}
              >
                Back to My Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

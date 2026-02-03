import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  WifiOff,
  Loader2,
  X,
  Upload,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMod4Events } from '@/hooks/useMod4Events';
import { useCurrentPosition } from '@/hooks/useGeolocation';

interface DeliveryStop {
  id: string;
  facility_id: string;
  facility_name: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  items_count: number;
  completed_at?: string;
}

interface BatchDetails {
  id: string;
  name: string;
  status: string;
  delivery_date: string;
  stops: DeliveryStop[];
  driver_id: string | null;
}

interface DriverContext {
  driverId: string;
  sessionId: string;
  deviceId: string;
}

function generateDeviceId(): string {
  const stored = localStorage.getItem('mod4_device_id');
  if (stored) return stored;
  const newId = `device_${crypto.randomUUID()}`;
  localStorage.setItem('mod4_device_id', newId);
  return newId;
}

export default function DeliveryExecutionPage() {
  const { id: batchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentStop, setCurrentStop] = useState<number>(0);
  const [driverContext, setDriverContext] = useState<DriverContext | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { position, getPosition } = useCurrentPosition();
  const {
    recordDeliveryStarted,
    recordDeliveryCompleted,
    recordBatchStarted,
    recordBatchCompleted,
    recordPhotoCaptured,
    isRecording,
    offlineQueueSize,
    syncOfflineEvents,
  } = useMod4Events({
    driverId: driverContext?.driverId,
    batchId,
  });

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync offline events when back online
      if (offlineQueueSize > 0) {
        syncOfflineEvents();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueueSize, syncOfflineEvents]);

  // Fetch driver context (driver_id linked to current user)
  useEffect(() => {
    async function fetchDriverContext() {
      if (!user) return;

      try {
        // Find driver record linked to this user
        const { data: driver, error } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching driver:', error);
          return;
        }

        if (driver) {
          // Check for active session
          const { data: session } = await supabase
            .from('driver_sessions')
            .select('id')
            .eq('driver_id', driver.id)
            .eq('status', 'active')
            .single();

          setDriverContext({
            driverId: driver.id,
            sessionId: session?.id || `session_${Date.now()}`,
            deviceId: generateDeviceId(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch driver context:', error);
      }
    }

    fetchDriverContext();
  }, [user]);

  // Fetch batch details
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
            delivery_date,
            assigned_driver_id
          `)
          .eq('id', batchId)
          .single();

        if (batchError) throw batchError;

        // Fetch facilities for this batch
        const { data: batchFacilities, error: facilityError } = await supabase
          .from('delivery_batch_facilities')
          .select(`
            id,
            facility_id,
            slot_index,
            status,
            completed_at,
            facilities (
              id,
              name,
              address
            )
          `)
          .eq('batch_id', batchId)
          .order('slot_index');

        if (facilityError) throw facilityError;

        // Get item counts per facility
        const { data: itemCounts } = await supabase
          .from('batch_items')
          .select('facility_id')
          .eq('batch_id', batchId);

        const facilityCounts: Record<string, number> = {};
        (itemCounts || []).forEach((item: any) => {
          facilityCounts[item.facility_id] = (facilityCounts[item.facility_id] || 0) + 1;
        });

        const stops: DeliveryStop[] = (batchFacilities || []).map((bf: any, index: number) => {
          const facility = bf.facilities;
          const isCompleted = bf.status === 'completed';
          const isFirst = index === 0;

          return {
            id: bf.id,
            facility_id: bf.facility_id,
            facility_name: facility?.name || 'Unknown Facility',
            address: facility?.address || '',
            status: isCompleted ? 'completed' : (isFirst ? 'in_progress' : 'pending'),
            items_count: facilityCounts[bf.facility_id] || 0,
            completed_at: bf.completed_at,
          };
        });

        // Find first non-completed stop
        const firstPendingIndex = stops.findIndex(s => s.status !== 'completed');
        if (firstPendingIndex >= 0) {
          stops[firstPendingIndex].status = 'in_progress';
          setCurrentStop(firstPendingIndex);
        }

        setBatch({
          id: batchData.id,
          name: batchData.name,
          status: batchData.status,
          delivery_date: batchData.delivery_date,
          stops,
          driver_id: batchData.assigned_driver_id,
        });

        // Record batch started if this is the first time opening
        if (driverContext && batchData.status === 'assigned') {
          await recordBatchStarted({
            ...driverContext,
            batchId: batchData.id,
            batchName: batchData.name,
            totalStops: stops.length,
          });

          // Update batch status to in-progress
          await supabase
            .from('delivery_batches')
            .update({ status: 'in-progress' })
            .eq('id', batchId);
        }
      } catch (error) {
        console.error('Failed to fetch batch details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBatchDetails();
  }, [batchId, driverContext]);

  const handleStartStop = async (stopIndex: number) => {
    if (!batch || !driverContext) return;

    const stop = batch.stops[stopIndex];

    try {
      // Get current position
      const pos = await getPosition();

      // Record delivery started event
      await recordDeliveryStarted({
        ...driverContext,
        batchId: batch.id,
        facilityId: stop.facility_id,
        facilityName: stop.facility_name,
        stopIndex,
      }, pos ? { lat: pos.lat, lng: pos.lng } : undefined);

      // Update local state
      const updatedStops = [...batch.stops];
      updatedStops[stopIndex].status = 'in_progress';
      setBatch({ ...batch, stops: updatedStops });
    } catch (error) {
      console.error('Failed to start stop:', error);
    }
  };

  const handleCompleteStop = async (stopIndex: number) => {
    if (!batch || !driverContext) return;

    const stop = batch.stops[stopIndex];

    try {
      // Get current position
      const pos = await getPosition();

      // Record delivery completed event
      await recordDeliveryCompleted({
        ...driverContext,
        batchId: batch.id,
        facilityId: stop.facility_id,
        facilityName: stop.facility_name,
        stopIndex,
        itemsDelivered: stop.items_count,
        proofCaptured: !!capturedPhoto,
      }, pos ? { lat: pos.lat, lng: pos.lng } : undefined);

      // Update database
      await supabase
        .from('delivery_batch_facilities')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stop.id);

      // Update local state
      const updatedStops = [...batch.stops];
      updatedStops[stopIndex].status = 'completed';
      updatedStops[stopIndex].completed_at = new Date().toISOString();

      // Move to next stop if available
      if (stopIndex + 1 < batch.stops.length) {
        updatedStops[stopIndex + 1].status = 'in_progress';
        setCurrentStop(stopIndex + 1);
      } else {
        // All stops completed - record batch completed
        await recordBatchCompleted({
          ...driverContext,
          batchId: batch.id,
          batchName: batch.name,
          totalStops: batch.stops.length,
          completedStops: batch.stops.length,
        });

        // Update batch status
        await supabase
          .from('delivery_batches')
          .update({ status: 'completed' })
          .eq('id', batch.id);
      }

      setBatch({ ...batch, stops: updatedStops });
      setCapturedPhoto(null);
    } catch (error) {
      console.error('Failed to complete stop:', error);
    }
  };

  const handleNavigate = (stopIndex: number) => {
    const stop = batch?.stops[stopIndex];
    if (!stop) return;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address || stop.facility_name)}`;
    window.open(mapsUrl, '_blank');
  };

  const handlePhotoCapture = async () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !batch || !driverContext) return;

    setIsCapturing(true);

    try {
      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const photoData = e.target?.result as string;
        setCapturedPhoto(photoData);

        // Get current position
        const pos = await getPosition();

        // Record photo captured event
        const currentStopData = batch.stops[currentStop];
        await recordPhotoCaptured({
          ...driverContext,
          batchId: batch.id,
          facilityId: currentStopData.facility_id,
          photoType: 'proof_of_delivery',
        }, pos ? { lat: pos.lat, lng: pos.lng } : undefined);

        setShowPhotoDialog(false);
        setIsCapturing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to capture photo:', error);
      setIsCapturing(false);
    }
  };

  const handleSignatureCapture = useCallback(() => {
    // Simple signature capture using canvas touch/mouse events
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const { x, y } = getCoords(e);
      lastX = x;
      lastY = y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, []);

  useEffect(() => {
    if (showSignatureDialog) {
      const cleanup = handleSignatureCapture();
      return cleanup;
    }
  }, [showSignatureDialog, handleSignatureCapture]);

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
      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{batch.name}</h1>
          <p className="text-muted-foreground">
            {completedStops} of {batch.stops.length} stops completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {offlineQueueSize > 0 && (
            <Badge variant="outline" className="text-amber-600">
              {offlineQueueSize} pending sync
            </Badge>
          )}
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
                      onClick={() => setShowPhotoDialog(true)}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Photo
                    </Button>
                  </div>

                  {/* Captured Photo Preview */}
                  {capturedPhoto && (
                    <div className="relative">
                      <img
                        src={capturedPhoto}
                        alt="Captured proof"
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setCapturedPhoto(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Delivery Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowSignatureDialog(true)}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Capture Signature
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => handleCompleteStop(index)}
                      disabled={isRecording}
                    >
                      {isRecording ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
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
                    {stop.completed_at && (
                      <span className="text-muted-foreground text-xs">
                        at {new Date(stop.completed_at).toLocaleTimeString()}
                      </span>
                    )}
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

      {/* Photo Capture Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture Photo</DialogTitle>
            <DialogDescription>
              Take a photo as proof of delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full h-32 border-dashed border-2"
              variant="outline"
              onClick={handlePhotoCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8" />
                  <span>Tap to take photo</span>
                </div>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Capture Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Signature</DialogTitle>
            <DialogDescription>
              Have the recipient sign below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name</Label>
              <Input id="recipient-name" placeholder="Enter recipient name" />
            </div>
            <div className="border rounded-md p-2 bg-white">
              <canvas
                ref={canvasRef}
                width={350}
                height={150}
                className="w-full touch-none cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}
            >
              Clear
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSignatureDialog(false)}>
              Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

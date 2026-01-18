import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, StopCircle, MapPin, Navigation, Gauge, Clock } from 'lucide-react';
import { useSessionDetail, useForceEndSession } from '@/hooks/admin/useSessions';
import { SessionGPSMap } from '@/components/admin/sessions/SessionGPSMap';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSessionDetail(id!);
  const forceEnd = useForceEndSession();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Session</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load session details'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { session, gpsQuality, gpsPoints } = data;

  const formatDuration = () => {
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sessions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Session Details</h1>
              <Badge className={STATUS_COLORS[session.status]} variant="secondary">
                {session.status === 'active' && (
                  <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
                )}
                {session.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {session.driver?.full_name || 'Unknown Driver'}
            </p>
          </div>
        </div>
        {session.status === 'active' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <StopCircle className="h-4 w-4 mr-2" />
                Force End Session
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Force End Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to force end this session? This action will immediately
                  terminate the driver's active session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => forceEnd.mutate(id!)}
                  className="bg-destructive text-destructive-foreground"
                >
                  {forceEnd.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Force End
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Session Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{formatDuration()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">
                  {session.total_distance_km?.toFixed(2) || '0'} km
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">GPS Points</p>
                <p className="text-2xl font-bold">{gpsPoints.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">GPS Quality</p>
                <p className="text-2xl font-bold">
                  {gpsQuality?.avg_accuracy ? `${gpsQuality.avg_accuracy.toFixed(1)}m` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPS Map */}
      <Card>
        <CardHeader>
          <CardTitle>GPS Trail</CardTitle>
          <CardDescription>
            Route taken during this session ({gpsPoints.length} GPS points recorded)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gpsPoints.length > 0 ? (
            <SessionGPSMap
              gpsPoints={gpsPoints}
              startLocation={session.start_location}
              endLocation={session.end_location}
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No GPS data available for this session</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Session ID</p>
              <p className="text-base font-mono text-xs">{session.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Driver</p>
              <p className="text-base">{session.driver?.full_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
              <p className="text-base font-mono">
                {session.vehicle?.plate_number || 'No vehicle assigned'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Started At</p>
              <p className="text-base">{new Date(session.started_at).toLocaleString()}</p>
            </div>
            {session.ended_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ended At</p>
                <p className="text-base">{new Date(session.ended_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* GPS Quality Details */}
      {gpsQuality && (
        <Card>
          <CardHeader>
            <CardTitle>GPS Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Average Accuracy</p>
                <p className="text-lg font-semibold">
                  {gpsQuality.avg_accuracy?.toFixed(2) || 'N/A'} m
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Min Accuracy</p>
                <p className="text-lg font-semibold">
                  {gpsQuality.min_accuracy?.toFixed(2) || 'N/A'} m
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Accuracy</p>
                <p className="text-lg font-semibold">
                  {gpsQuality.max_accuracy?.toFixed(2) || 'N/A'} m
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-lg font-semibold">{gpsQuality.total_points || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

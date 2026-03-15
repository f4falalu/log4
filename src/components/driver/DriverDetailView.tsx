import { Driver } from '@/types';
import { useDriverVehicles } from '@/hooks/useDriverVehicles';
import { useDriverBatches } from '@/hooks/useDriverBatches';
import { useSingleDriverGPS } from '@/hooks/useDriverGPS';
import { generateMockStatistics } from '@/lib/mockStatisticsData';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, MessageSquare, MoreVertical, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { VehicleIllustration } from '@/components/vehicle/VehicleIllustration';
import { BatchCard } from '@/components/driver/BatchCard';
import { DriverStatisticsCharts } from '@/components/driver/DriverStatisticsCharts';
import { DriverLocationMap } from '@/components/driver/DriverLocationMap';
import { DriverMobileIntegration } from '@/components/driver/DriverMobileIntegration';

interface DriverDetailViewProps {
  driver: Driver;
}

export function DriverDetailView({ driver }: DriverDetailViewProps) {
  const { data: vehicles } = useDriverVehicles(driver.id);
  const currentVehicle = vehicles?.find(v => v.isCurrent);

  const { data: batches, isLoading: batchesLoading } = useDriverBatches(driver.id);
  const activeBatches = batches?.filter(b => b.status === 'assigned' || b.status === 'in-progress') || [];
  const completedBatches = batches?.filter(b => b.status === 'completed' || b.status === 'cancelled') || [];

  const statistics = generateMockStatistics(driver.id);

  // Real-time GPS position
  const gpsData = useSingleDriverGPS(driver.id);
  const gpsPosition = gpsData.getDriverPosition(driver.id);
  const gpsLat = gpsPosition?.lat ?? driver.currentLocation?.lat;
  const gpsLng = gpsPosition?.lng ?? driver.currentLocation?.lng;
  const isOnline = gpsPosition
    ? Date.now() - gpsPosition.capturedAt.getTime() < 5 * 60 * 1000
    : false;

  const initials = driver.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Calculate dimensions from capacity (mock calculation)
  const loadLength = currentVehicle ? Math.floor(117 + (currentVehicle.capacity / 100)) : 117;
  const loadWidth = currentVehicle ? Math.floor(67 + (currentVehicle.capacity / 150)) : 67;
  const loadVolume = currentVehicle ? Math.floor(currentVehicle.capacity * 123) : 353937;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{driver.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  ID: {driver.id.slice(0, 11)}
                </Badge>
                {driver.licenseVerified && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                {!driver.onboardingCompleted && (
                  <XCircle className="h-4 w-4 text-warning" />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label="Send message">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Call driver">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Driver Location Map */}
        <Card className="mb-6">
          <CardContent className="p-0 h-[200px]">
            <DriverLocationMap
              lat={gpsLat}
              lng={gpsLng}
              driverName={driver.name}
              heading={gpsPosition?.heading ?? undefined}
              lastUpdate={gpsPosition?.capturedAt}
              isOnline={isOnline}
            />
          </CardContent>
        </Card>

        {/* Vehicle Display */}
        {currentVehicle && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">{currentVehicle.model}</h2>

              {/* Vehicle Image */}
              <div className="relative aspect-video mb-4 rounded-lg overflow-hidden bg-muted">
                {currentVehicle.photoUrl ? (
                  <img
                    src={currentVehicle.photoUrl}
                    alt={currentVehicle.model}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <VehicleIllustration type={currentVehicle.type} className="w-2/3 h-2/3" />
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Payload</div>
                  <div className="text-xl font-bold">{currentVehicle.capacity.toLocaleString()} lbs</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Load Volume</div>
                  <div className="text-xl font-bold">{loadVolume.toLocaleString()} in³</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Load Length</div>
                  <div className="text-xl font-bold">{loadLength} in</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Load Width</div>
                  <div className="text-xl font-bold">{loadWidth} in</div>
                </div>
              </div>

              {/* License Plate */}
              <div className="flex items-center justify-between">
                <div className="bg-warning text-warning-foreground font-bold px-4 py-2 rounded border-2 border-foreground">
                  {currentVehicle.plateNumber}
                </div>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="routes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
          </TabsList>

          <TabsContent value="routes" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Active Routes
              </h3>
              <Badge variant="secondary">{activeBatches.length} active</Badge>
            </div>
            {batchesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeBatches.length > 0 ? (
              <div className="space-y-4">
                {activeBatches.map(batch => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No active routes at the moment
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
              Delivery History
            </h3>
            {batchesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedBatches.length > 0 ? (
              <div className="space-y-4">
                {completedBatches.map(batch => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No completed deliveries yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <DriverStatisticsCharts statistics={statistics} />
          </TabsContent>

          <TabsContent value="mobile" className="mt-6">
            <DriverMobileIntegration driverId={driver.id} driverEmail={driver.email} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

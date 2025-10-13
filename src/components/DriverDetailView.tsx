import { Driver } from '@/types';
import { useDriverVehicles } from '@/hooks/useDriverVehicles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, MessageSquare, MoreVertical, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { VehicleIllustration } from './VehicleIllustration';
import { RouteCard } from './RouteCard';
import { DriverStatisticsCharts } from './DriverStatisticsCharts';
import { generateMockRoutes } from '@/lib/mockRouteData';
import { generateMockStatistics } from '@/lib/mockStatisticsData';

interface DriverDetailViewProps {
  driver: Driver;
}

export function DriverDetailView({ driver }: DriverDetailViewProps) {
  const { data: vehicles, isLoading: vehiclesLoading } = useDriverVehicles(driver.id);
  const currentVehicle = vehicles?.find(v => v.isCurrent);
  
  const routes = generateMockRoutes(driver.id);
  const statistics = generateMockStatistics(driver.id);
  const activeRoutes = routes.filter(r => r.status !== 'completed');

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
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {!driver.onboardingCompleted && (
                  <XCircle className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

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
                <div className="bg-yellow-400 text-black font-bold px-4 py-2 rounded border-2 border-black">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="statistics">Driver Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="routes" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Now on the way
              </h3>
              <Badge variant="secondary">{activeRoutes.length} active</Badge>
            </div>
            {activeRoutes.length > 0 ? (
              <div className="space-y-4">
                {activeRoutes.map(route => (
                  <RouteCard key={route.id} route={route} />
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
            <div className="space-y-4">
              {routes
                .filter(r => r.status === 'completed')
                .map(route => (
                  <RouteCard key={route.id} route={route} />
                ))}
            </div>
            {routes.filter(r => r.status === 'completed').length === 0 && (
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
        </Tabs>
      </div>
    </ScrollArea>
  );
}

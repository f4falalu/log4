import { Driver } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, Award, Package, TrendingUp } from 'lucide-react';
import { DriverVehicleCarousel } from './DriverVehicleCarousel';
import { useDriverVehicles } from '@/hooks/useDriverVehicles';
import { Skeleton } from '@/components/ui/skeleton';

interface DriverDetailPanelProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriverDetailPanel({ driver, open, onOpenChange }: DriverDetailPanelProps) {
  const { data: vehicles, isLoading: vehiclesLoading } = useDriverVehicles(driver?.id || null);

  if (!driver) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'busy': return 'secondary';
      case 'offline': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <SheetTitle className="text-2xl">{driver.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(driver.status)}>
                  {getStatusText(driver.status)}
                </Badge>
                {driver.licenseVerified && (
                  <Badge variant="outline" className="gap-1">
                    <Award className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Phone className="w-4 h-4" />
              Call
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="w-4 h-4" />
              Message
            </Button>
          </div>

          {/* Contact Info Card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{driver.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Shift: {driver.shiftStart} - {driver.shiftEnd}</span>
            </div>
            {driver.currentLocation && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Location updated: {driver.locationUpdatedAt ? new Date(driver.locationUpdatedAt).toLocaleString() : 'Never'}</span>
              </div>
            )}
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{driver.totalDeliveries || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Deliveries</p>
                </Card>
                <Card className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{driver.onTimePercentage || 100}%</p>
                  <p className="text-xs text-muted-foreground">On-Time Rate</p>
                </Card>
                <Card className="p-4 text-center">
                  <Award className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                  <p className="text-2xl font-bold">{driver.performanceScore?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-muted-foreground">Performance</p>
                </Card>
              </div>

              {/* Vehicle Carousel */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Assigned Vehicles</h3>
                {vehiclesLoading ? (
                  <Card className="p-6">
                    <Skeleton className="w-full aspect-[16/9] mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ) : (
                  <DriverVehicleCarousel vehicles={vehicles || []} />
                )}
              </div>

              {/* License Info */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">License Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{driver.licenseType}</p>
                  </div>
                  {driver.licenseExpiry && (
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">{new Date(driver.licenseExpiry).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="routes" className="space-y-4">
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active routes</p>
                <p className="text-sm text-muted-foreground mt-2">Route information will appear here when the driver is assigned</p>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No delivery history yet</p>
                <p className="text-sm text-muted-foreground mt-2">Past deliveries will appear here</p>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <Card className="p-6">
                <h4 className="font-semibold mb-4">Performance Statistics</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Deliveries</span>
                      <span className="font-semibold">{driver.onTimePercentage || 100}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${driver.onTimePercentage || 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Performance Score</span>
                      <span className="font-semibold">{driver.performanceScore?.toFixed(1) || '0.0'}/10</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${((driver.performanceScore || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total Deliveries: <span className="font-semibold text-foreground">{driver.totalDeliveries || 0}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Max Hours: <span className="font-semibold text-foreground">{driver.maxHours}h/day</span>
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

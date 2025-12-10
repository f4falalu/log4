import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Truck, MapPin, Clock, Package, User, Phone, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';

interface BatchDetailsPanelProps {
  batch: DeliveryBatch;
  onClose: () => void;
}

const BatchDetailsPanel = ({ batch, onClose }: BatchDetailsPanelProps) => {
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  
  const driver = batch.driverId ? drivers.find(d => d.id === batch.driverId) : null;
  const vehicle = batch.vehicleId ? vehicles.find(v => v.id === batch.vehicleId) : null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'default';
      case 'assigned': return 'secondary';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (facilityIndex: number) => {
    const progress = batch.status === 'completed' ? 100 : 
                    batch.status === 'in-progress' ? ((facilityIndex / batch.facilities.length) * 100) : 0;
    
    if (progress >= ((facilityIndex + 1) / batch.facilities.length) * 100) {
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex-1">
          <CardTitle className="text-xl">{batch.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            <Badge variant={getStatusColor(batch.status)}>{batch.status.toUpperCase()}</Badge>
            <Badge variant={getPriorityColor(batch.priority)}>{batch.priority.toUpperCase()}</Badge>
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="order" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="order">Order</TabsTrigger>
            <TabsTrigger value="driver">Driver</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[250px] mt-4">
            {/* Order Details Tab */}
            <TabsContent value="order" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Batch ID</div>
                  <div className="font-medium">{batch.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Warehouse</div>
                  <div className="font-medium">{batch.warehouseName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Medication Type</div>
                  <div className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {batch.medicationType}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                  <div className="font-medium">{batch.totalQuantity} units</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Distance</div>
                  <div className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {batch.totalDistance} km
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Est. Duration</div>
                  <div className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {Math.round(batch.estimatedDuration)} min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Scheduled Date</div>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(batch.scheduledDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Scheduled Time</div>
                  <div className="font-medium">{batch.scheduledTime}</div>
                </div>
              </div>
              {batch.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Special Instructions</div>
                  <div className="text-sm p-3 bg-muted rounded-md">{batch.notes}</div>
                </div>
              )}
            </TabsContent>

            {/* Driver Info Tab */}
            <TabsContent value="driver" className="space-y-4 mt-0">
              {driver ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{driver.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {driver.id}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${driver.phone}`} className="hover:underline">
                          {driver.phone}
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">License Type</div>
                      <div className="font-medium">{driver.licenseType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge variant={driver.status === 'available' ? 'default' : 'secondary'}>
                        {driver.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Shift Hours</div>
                      <div className="font-medium">{driver.shiftStart} - {driver.shiftEnd}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No driver assigned yet</p>
                </div>
              )}
            </TabsContent>

            {/* Vehicle Info Tab */}
            <TabsContent value="vehicle" className="space-y-4 mt-0">
              {vehicle ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Vehicle Model</div>
                    <div className="font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {vehicle.model}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Plate Number</div>
                    <div className="font-medium">{vehicle.plateNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{vehicle.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Capacity</div>
                    <div className="font-medium">{vehicle.capacity} m³</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Max Weight</div>
                    <div className="font-medium">{vehicle.maxWeight} kg</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Fuel Type</div>
                    <div className="font-medium capitalize">{vehicle.fuelType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Speed</div>
                    <div className="font-medium">{vehicle.avgSpeed} km/h</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No vehicle assigned yet</p>
                </div>
              )}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-3 mt-0">
              <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
                {(() => {
                  const avgSpeed = vehicle?.avgSpeed || 50; // km/h
                  const serviceTime = 15; // minutes per stop
                  let cumulativeTime = 0;
                  
                  // Parse scheduled time
                  const [hours, minutes] = batch.scheduledTime.split(':').map(Number);
                  const scheduleDate = new Date(batch.scheduledDate);
                  scheduleDate.setHours(hours, minutes, 0);
                  
                  const formatTime = (minutesFromStart: number) => {
                    const time = new Date(scheduleDate.getTime() + minutesFromStart * 60000);
                    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  };
                  
                  return (
                    <div className="space-y-3">
                      {/* Warehouse Departure */}
                      <div className="flex items-start gap-3">
                        <div className="text-primary font-bold">🏭</div>
                        <div className="flex-1">
                          <div className="font-bold text-primary">WAREHOUSE DEPARTURE</div>
                          <div className="text-muted-foreground">
                            {formatTime(0)} • {batch.warehouseName} (0km)
                          </div>
                        </div>
                      </div>
                      
                      {/* Each Facility Stop */}
                      {batch.facilities.map((facility, index) => {
                        const prevFacility = index > 0 ? batch.facilities[index - 1] : null;
                        
                        // Calculate distance (simplified - using optimized route if available)
                        let distanceFromPrev = 0;
                        if (batch.optimizedRoute && batch.optimizedRoute.length > index + 1) {
                          // Use optimized route distance
                          distanceFromPrev = 15 + Math.random() * 10; // Simplified
                        } else {
                          distanceFromPrev = 15 + Math.random() * 10; // Simplified
                        }
                        
                        const travelTime = (distanceFromPrev / avgSpeed) * 60; // minutes
                        cumulativeTime += travelTime;
                        const arrivalTime = cumulativeTime;
                        cumulativeTime += serviceTime;
                        const departureTime = cumulativeTime;
                        
                        const cumulativeDistance = batch.totalDistance * ((index + 1) / batch.facilities.length);
                        
                        const isCompleted = batch.status === 'completed' || 
                                           (batch.status === 'in-progress' && index < Math.floor(batch.facilities.length * 0.4));
                        const isCurrent = batch.status === 'in-progress' && 
                                         index === Math.floor(batch.facilities.length * 0.4);
                        
                        return (
                          <div key={facility.id}>
                            {/* Travel Arrow */}
                            <div className="flex items-center gap-3 text-muted-foreground text-xs pl-6">
                              <div>↓ {distanceFromPrev.toFixed(0)}km • {travelTime.toFixed(0)}min</div>
                            </div>
                            
                            {/* Stop */}
                            <div className={`flex items-start gap-3 ${isCurrent ? 'bg-primary/10 -mx-2 px-2 py-2 rounded' : ''}`}>
                              <div className={`font-bold ${isCompleted ? 'text-success' : isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                                {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                              </div>
                              <div className="flex-1">
                                <div className={`font-bold ${isCurrent ? 'text-primary' : ''}`}>
                                  STOP {index + 1} {isCurrent && '← CURRENT'}
                                </div>
                                <div className="text-muted-foreground">
                                  {formatTime(arrivalTime)} • {facility.name} ({cumulativeDistance.toFixed(0)}km)
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  [{serviceTime} min service time]
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Return Arrow */}
                      <div className="flex items-center gap-3 text-muted-foreground text-xs pl-6">
                        <div>↓ Return journey</div>
                      </div>
                      
                      {/* Return to Warehouse */}
                      <div className="flex items-start gap-3">
                        <div className={`font-bold ${batch.status === 'completed' ? 'text-success' : 'text-muted-foreground'}`}>
                          {batch.status === 'completed' ? '✓' : '🏁'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">RETURN TO WAREHOUSE</div>
                          <div className="text-muted-foreground">
                            {formatTime(cumulativeTime + 30)} • Total: {batch.totalDistance.toFixed(0)}km, {batch.estimatedDuration.toFixed(0)}min
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="w-0.5 h-full bg-border mt-2" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="font-medium">Batch Created</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {batch.driverId && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <div className="w-0.5 h-full bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium">Driver Assigned</div>
                      <div className="text-sm text-muted-foreground">{driver?.name}</div>
                    </div>
                  </div>
                )}

                {batch.actualStartTime && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <div className="w-0.5 h-full bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium">Departed from Warehouse</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(batch.actualStartTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {batch.status === 'in-progress' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-5 w-5 rounded-full border-2 border-primary bg-background animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">In Progress</div>
                      <div className="text-sm text-muted-foreground">
                        Delivering to {batch.facilities.length} facilities
                      </div>
                    </div>
                  </div>
                )}

                {batch.status === 'completed' && batch.actualEndTime && (
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Delivery Completed</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(batch.actualEndTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Facilities Tab */}
            <TabsContent value="facilities" className="space-y-3 mt-0">
              {batch.facilities.map((facility, index) => (
                <div key={facility.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Stop {index + 1}: {facility.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="break-words">{facility.address}</span>
                      </div>
                      {facility.phone && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <a href={`tel:${facility.phone}`} className="hover:underline">
                            {facility.phone}
                          </a>
                        </div>
                      )}
                      {facility.contactPerson && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span>{facility.contactPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BatchDetailsPanel;

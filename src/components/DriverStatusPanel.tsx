import React, { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  User, 
  Truck, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Timer,
  Navigation,
  Package
} from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { DRIVERS, VEHICLES } from '@/data/fleet';

interface DriverStatusPanelProps {
  batches: DeliveryBatch[];
}

const DriverStatusPanel = ({ batches }: DriverStatusPanelProps) => {
  const [selectedTab, setSelectedTab] = useState('active');

  // Get active deliveries (assigned, in-progress)
  const activeDeliveries = batches.filter(batch => 
    ['assigned', 'in-progress'].includes(batch.status) && batch.driverId
  );

  // Get available drivers
  const availableDrivers = DRIVERS.filter(driver => driver.status === 'available');

  // Get busy drivers
  const busyDrivers = DRIVERS.filter(driver => driver.status === 'busy');

  const getDriver = (driverId?: string) => {
    return DRIVERS.find(d => d.id === driverId);
  };

  const getVehicle = (vehicleId?: string) => {
    return VEHICLES.find(v => v.id === vehicleId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Timer className="w-4 h-4 text-warning" />;
      case 'in-progress':
        return <Navigation className="w-4 h-4 text-primary" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'warning';
      case 'in-progress': return 'default';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return '🚛';
      case 'van': return '🚐';
      case 'pickup': return '🛻';
      case 'car': return '🚗';
      default: return '🚛';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full bg-card border-t">
      <div className="p-4 h-full">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center">
              <User className="w-4 h-4 mr-2 text-primary" />
              Fleet Status
            </h3>
            
            <TabsList className="grid w-80 grid-cols-3">
              <TabsTrigger value="active" className="text-xs">
                Active ({activeDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-xs">
                Available ({availableDrivers.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All Drivers ({DRIVERS.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="active" className="h-full overflow-y-auto space-y-2 mt-0">
              {activeDeliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Navigation className="w-8 h-8 mb-2" />
                  <p className="text-sm">No active deliveries</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {activeDeliveries.map((batch) => {
                    const driver = getDriver(batch.driverId);
                    const vehicle = getVehicle(batch.vehicleId);
                    
                    return (
                      <Card key={batch.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {driver?.name.charAt(0) || 'D'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{driver?.name || 'Unassigned'}</p>
                                <p className="text-xs text-muted-foreground">{batch.name}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge variant={getStatusColor(batch.status) as any} className="text-xs">
                                {batch.status}
                              </Badge>
                              <Badge variant={getPriorityColor(batch.priority) as any} className="text-xs">
                                {batch.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {/* Vehicle Info */}
                            {vehicle && (
                              <div className="flex items-center space-x-2 text-xs">
                                <span>{getVehicleIcon(vehicle.type)}</span>
                                <span>{vehicle.model}</span>
                                <Badge variant="outline" className="text-xs">
                                  {vehicle.plateNumber}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Route Info */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span>{batch.facilities.length} stops</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Timer className="w-3 h-3 text-muted-foreground" />
                                <span>{Math.round(batch.estimatedDuration)}min</span>
                              </div>
                            </div>
                            
                            {/* Schedule */}
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(batch.scheduledDate).toLocaleDateString()} at {formatTime(batch.scheduledTime)}
                              </span>
                            </div>
                            
                            {/* Contact */}
                            {driver?.phone && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span>{driver.phone}</span>
                                </div>
                                <Button size="sm" variant="outline" className="h-6 text-xs">
                                  Track
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="available" className="h-full overflow-y-auto space-y-2 mt-0">
              {availableDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <User className="w-8 h-8 mb-2" />
                  <p className="text-sm">No available drivers</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {availableDrivers.map((driver) => (
                    <Card key={driver.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-success/10 text-success">
                              {driver.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{driver.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs bg-success/20 text-success">
                                Available
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {driver.licenseType}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(driver.shiftStart)} - {formatTime(driver.shiftEnd)}</span>
                              </div>
                              {driver.phone && (
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{driver.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="h-full overflow-y-auto space-y-2 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {DRIVERS.map((driver) => {
                  const isAssigned = activeDeliveries.some(batch => batch.driverId === driver.id);
                  const assignedBatch = activeDeliveries.find(batch => batch.driverId === driver.id);
                  
                  return (
                    <Card key={driver.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className={`
                              ${driver.status === 'available' ? 'bg-success/10 text-success' : 
                                driver.status === 'busy' ? 'bg-warning/10 text-warning' : 
                                'bg-muted text-muted-foreground'}
                            `}>
                              {driver.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{driver.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={
                                  driver.status === 'available' ? 'secondary' : 
                                  driver.status === 'busy' ? 'secondary' : 'secondary'
                                } 
                                className={`text-xs ${
                                  driver.status === 'available' ? 'bg-success/20 text-success' :
                                  driver.status === 'busy' ? 'bg-warning/20 text-warning' : ''
                                }`}
                              >
                                {driver.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {driver.licenseType}
                              </Badge>
                            </div>
                            
                            {isAssigned && assignedBatch && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <div className="flex items-center space-x-1 text-primary">
                                  <Package className="w-3 h-3" />
                                  <span className="font-medium">{assignedBatch.name}</span>
                                </div>
                                <div className="text-muted-foreground mt-1">
                                  {assignedBatch.facilities.length} stops • {Math.round(assignedBatch.estimatedDuration)}min
                                </div>
                              </div>
                            )}
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(driver.shiftStart)} - {formatTime(driver.shiftEnd)}</span>
                              </div>
                              {driver.phone && (
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{driver.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverStatusPanel;
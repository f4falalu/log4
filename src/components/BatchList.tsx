import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Package, 
  MapPin, 
  Clock, 
  Route, 
  User, 
  Truck,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { DRIVERS, VEHICLES } from '@/data/fleet';

interface BatchListProps {
  batches: DeliveryBatch[];
  onBatchUpdate: (batchId: string, updates: Partial<DeliveryBatch>) => void;
}

const BatchList = ({ batches, onBatchUpdate }: BatchListProps) => {
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'secondary';
      case 'assigned': return 'default';
      case 'in-progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return Clock;
      case 'assigned': return CheckCircle;
      case 'in-progress': return Play;
      case 'completed': return CheckCircle;
      case 'cancelled': return Square;
      default: return Clock;
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

  const getDriver = (driverId?: string) => {
    return DRIVERS.find(d => d.id === driverId);
  };

  const getVehicle = (vehicleId?: string) => {
    return VEHICLES.find(v => v.id === vehicleId);
  };

  const handleStatusUpdate = (batchId: string, newStatus: DeliveryBatch['status']) => {
    const updates: Partial<DeliveryBatch> = { status: newStatus };
    
    if (newStatus === 'in-progress' && !batches.find(b => b.id === batchId)?.actualStartTime) {
      updates.actualStartTime = new Date().toISOString();
    }
    
    if (newStatus === 'completed') {
      updates.actualEndTime = new Date().toISOString();
    }

    onBatchUpdate(batchId, updates);
  };

  const toggleExpanded = (batchId: string) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No delivery batches yet</p>
            <p className="text-sm">Create your first delivery batch using the scheduler.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Batches</h3>
        <Badge variant="outline">
          {batches.length} batch{batches.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      {batches.map((batch) => {
        const StatusIcon = getStatusIcon(batch.status);
        const driver = getDriver(batch.driverId);
        const vehicle = getVehicle(batch.vehicleId);
        const isExpanded = expandedBatch === batch.id;

        return (
          <Card key={batch.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-4 h-4 text-primary" />
                    {batch.name}
                    <Badge variant={getPriorityColor(batch.priority)} className="text-xs">
                      {batch.priority}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {batch.facilities.length} facilities • {batch.totalDistance}km • {Math.round(batch.estimatedDuration)}min
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(batch.status)} className="flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {batch.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(batch.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {format(new Date(batch.scheduledDate), 'MMM d, yyyy')} at {batch.scheduledTime}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Medication</p>
                  <p className="font-medium">{batch.medicationType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{batch.totalQuantity} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{batch.warehouseName}</p>
                </div>
              </div>

              {/* Fleet Assignment */}
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {driver ? driver.name : 'Unassigned'}
                  </span>
                  {driver && (
                    <Badge variant="outline" className="text-xs">
                      {driver.licenseType}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {vehicle ? (
                      <>
                        {getVehicleIcon(vehicle.type)} {vehicle.model}
                      </>
                    ) : 'Unassigned'}
                  </span>
                  {vehicle && (
                    <Badge variant="outline" className="text-xs">
                      {vehicle.capacity}m³
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Facilities ({batch.facilities.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {batch.facilities.map((facility, index) => (
                        <div key={facility.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                          <span>{facility.name}</span>
                          <span className="text-muted-foreground">({facility.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {batch.notes && (
                    <div>
                      <h4 className="font-medium mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                        {batch.notes}
                      </p>
                    </div>
                  )}

                  {/* Timing Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{format(new Date(batch.createdAt), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                    {batch.actualStartTime && (
                      <div>
                        <p className="text-muted-foreground">Started</p>
                        <p>{format(new Date(batch.actualStartTime), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                    {batch.actualEndTime && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p>{format(new Date(batch.actualEndTime), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {batch.status === 'planned' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(batch.id, 'assigned')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                )}
                {batch.status === 'assigned' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusUpdate(batch.id, 'in-progress')}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                {batch.status === 'in-progress' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusUpdate(batch.id, 'completed')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
                {(batch.status === 'planned' || batch.status === 'assigned') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(batch.id, 'cancelled')}
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BatchList;
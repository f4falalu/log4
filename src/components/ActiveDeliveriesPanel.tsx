import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Truck, MapPin, Clock, Package } from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { DRIVERS, VEHICLES } from '@/data/fleet';

interface ActiveDeliveriesPanelProps {
  batches: DeliveryBatch[];
  onBatchClick?: (batchId: string) => void;
}

const ActiveDeliveriesPanel = ({ batches, onBatchClick }: ActiveDeliveriesPanelProps) => {
  const activeBatches = batches.filter(
    b => b.status === 'in-progress' || b.status === 'assigned'
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-green-600';
      case 'assigned': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Unassigned';
    return DRIVERS.find(d => d.id === driverId)?.name || 'Unknown';
  };

  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return 'N/A';
    const vehicle = VEHICLES.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plateNumber})` : 'N/A';
  };

  // Calculate progress based on time (simplified - in real app would track actual stops)
  const getProgress = (batch: DeliveryBatch) => {
    if (batch.status === 'assigned') return 0;
    if (batch.status === 'completed') return 100;
    // Simulate progress based on facilities count
    return Math.min(100, (batch.facilities.length / 5) * 100);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Active Deliveries ({activeBatches.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 p-6 pt-0">
            {activeBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No active deliveries</p>
              </div>
            ) : (
              activeBatches.map((batch) => {
                const progress = getProgress(batch);
                const completedStops = Math.floor((progress / 100) * batch.facilities.length);
                
                return (
                  <Card 
                    key={batch.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onBatchClick?.(batch.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{batch.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getStatusColor(batch.status)}>
                                {batch.status === 'in-progress' ? '🚛 In Progress' : '📋 Assigned'}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(batch.priority)}>
                                {batch.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Driver & Vehicle */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            <span className="truncate">{getDriverName(batch.driverId)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{batch.facilities.length} stops</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Stop {completedStops}/{batch.facilities.length}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {batch.totalDistance}km
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(batch.estimatedDuration)}min
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {batch.medicationType}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActiveDeliveriesPanel;

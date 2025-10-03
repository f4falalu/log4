import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Truck, MapPin, Clock, Package } from 'lucide-react';
import { DeliveryBatch } from '@/types';
import { DRIVERS, VEHICLES } from '@/data/fleet';

interface ActiveDeliveriesPanelProps {
  batches: DeliveryBatch[];
  selectedBatchId: string | null;
  statusFilter: 'all' | 'assigned' | 'in-progress' | 'completed' | 'delayed';
  onBatchClick?: (batchId: string) => void;
  onFilterChange?: (filter: 'all' | 'assigned' | 'in-progress' | 'completed' | 'delayed') => void;
}

const ActiveDeliveriesPanel = ({ 
  batches, 
  selectedBatchId,
  statusFilter,
  onBatchClick,
  onFilterChange 
}: ActiveDeliveriesPanelProps) => {
  // Filter batches based on status filter
  const filteredBatches = batches.filter(batch => {
    if (statusFilter === 'all') {
      return batch.status === 'in-progress' || batch.status === 'assigned' || batch.status === 'completed';
    }
    return batch.status === statusFilter;
  });

  // Count batches by status for tabs
  const statusCounts = {
    all: batches.filter(b => b.status === 'in-progress' || b.status === 'assigned' || b.status === 'completed').length,
    assigned: batches.filter(b => b.status === 'assigned').length,
    'in-progress': batches.filter(b => b.status === 'in-progress').length,
    completed: batches.filter(b => b.status === 'completed').length,
    delayed: 0, // Would need actual delay logic
  };

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5" />
          Active Deliveries
        </CardTitle>
        
        {/* Status Filter Tabs */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'assigned', 'in-progress', 'completed', 'delayed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => onFilterChange?.(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status === 'all' ? 'All' : 
               status === 'in-progress' ? 'In Progress' :
               status.charAt(0).toUpperCase() + status.slice(1)} 
              <span className="ml-1.5 opacity-70">({statusCounts[status]})</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 p-6 pt-0">
            {filteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No active deliveries</p>
              </div>
            ) : (
              filteredBatches.map((batch) => {
                const progress = getProgress(batch);
                const completedStops = Math.floor((progress / 100) * batch.facilities.length);
                const isSelected = selectedBatchId === batch.id;
                
                return (
                  <Card 
                    key={batch.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-2 border-primary shadow-lg scale-[1.02]' 
                        : 'border hover:border-muted-foreground/50 hover:shadow-md'
                    }`}
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

                        {/* Enhanced Progress Display */}
                        <div className="bg-muted/50 rounded-lg p-3 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-sm font-bold ${
                                  progress >= 70 ? 'bg-green-100 text-green-700 border-green-300' :
                                  progress >= 30 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                  'bg-gray-100 text-gray-700 border-gray-300'
                                }`}
                              >
                                Stop {completedStops}/{batch.facilities.length}
                              </Badge>
                              <div className="flex gap-0.5">
                                {Array.from({ length: batch.facilities.length }).map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${
                                      idx < completedStops ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {batch.status === 'in-progress' && completedStops < batch.facilities.length && (
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1 mb-1">
                                <MapPin className="h-3 w-3" />
                                <span className="font-medium">Current: {batch.facilities[completedStops]?.name || 'Unknown'}</span>
                              </div>
                              {completedStops + 1 < batch.facilities.length && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Next: {batch.facilities[completedStops + 1]?.name} • ETA 15 min</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {batch.status === 'assigned' && (
                            <div className="text-xs text-muted-foreground">
                              Ready to depart from {batch.warehouseName}
                            </div>
                          )}
                          
                          {batch.status === 'completed' && (
                            <div className="text-xs text-green-600 font-medium">
                              ✓ All stops completed
                            </div>
                          )}
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

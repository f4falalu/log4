import { useState, useMemo } from 'react';
import { Facility, Warehouse, DeliveryBatch } from '@/types';
import KPIMetrics from '@/components/dashboard/KPIMetrics';
import FleetStatus from '@/components/dashboard/FleetStatus';
import MapView from '@/components/MapView';
import ActiveDeliveriesPanel from '@/components/delivery/ActiveDeliveriesPanel';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import BatchDetailsPanel from '@/components/delivery/BatchDetailsPanel';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRealtimeBatches } from '@/hooks/useRealtimeBatches';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { useRealtimeRouteProgress } from '@/hooks/useRealtimeRouteProgress';

interface CommandCenterProps {
  facilities: Facility[];
  warehouses: Warehouse[];
  batches: DeliveryBatch[];
}

const CommandCenter = ({ facilities, warehouses, batches }: CommandCenterProps) => {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'in-progress' | 'completed' | 'delayed'>('all');
  
  // Enable real-time updates
  useRealtimeBatches();
  useRealtimeDrivers();
  useRealtimeRouteProgress();

  const selectedBatch = useMemo(() => 
    batches.find(b => b.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  const handleRefresh = () => {
    setLastRefresh(new Date());
    toast.success('Data refreshed', {
      description: `Updated at ${new Date().toLocaleTimeString()}`
    });
  };

  const handleBatchClick = (batchId: string) => {
    if (selectedBatchId === batchId) {
      setSelectedBatchId(null);
    } else {
      setSelectedBatchId(batchId);
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
        toast.info(`Viewing ${batch.name}`, {
          description: `${batch.facilities.length} stops • ${batch.totalDistance}km`
        });
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground text-sm">
            Real-time operations dashboard • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Metrics & Fleet Status */}
      <div className="space-y-4">
        <KPIMetrics batches={batches} />
        <FleetStatus batches={batches} />
      </div>

      {/* Main Content: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Active Deliveries List */}
        <div className="lg:col-span-1">
          <ActiveDeliveriesPanel 
            batches={batches}
            selectedBatchId={selectedBatchId}
            statusFilter={statusFilter}
            onBatchClick={handleBatchClick}
            onFilterChange={setStatusFilter}
          />
        </div>

        {/* RIGHT: Map + Details */}
        <div className="lg:col-span-2 space-y-4">
        <MapView
          facilities={facilities}
          warehouses={warehouses}
          batches={batches}
          selectedBatchId={selectedBatchId}
          onBatchClick={handleBatchClick}
          center={[12.0, 8.5]}
          zoom={7}
        />

          {/* Batch Details Panel */}
          {selectedBatch && (
            <BatchDetailsPanel 
              batch={selectedBatch}
              onClose={() => setSelectedBatchId(null)}
            />
          )}

          {!selectedBatch && (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
              <p className="text-sm">👈 Select a delivery from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Activity Timeline */}
      <ActivityTimeline batches={batches} />
    </div>
  );
};

export default CommandCenter;

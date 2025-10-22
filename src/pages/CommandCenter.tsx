import { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
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
    <Layout>
      <div className="space-y-5">
        {/* Minimal Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Command Center</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Real-time operations • {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            className="h-8 gap-1.5 text-[13px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* KPI Metrics */}
        <KPIMetrics batches={batches} />

        {/* Fleet Status */}
        <FleetStatus batches={batches} />

        {/* Main Content: Clean Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* LEFT: Active Deliveries Panel */}
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
          <div className="lg:col-span-2 space-y-6">
            {/* Map Container */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <MapView
                facilities={facilities}
                warehouses={warehouses}
                batches={batches}
                selectedBatchId={selectedBatchId}
                onBatchClick={handleBatchClick}
                center={[12.0, 8.5]}
                zoom={7}
              />
            </div>

            {/* Batch Details Panel */}
            {selectedBatch && (
              <div className="bg-card border rounded-xl shadow-md animate-in fade-in">
                <BatchDetailsPanel 
                  batch={selectedBatch}
                  onClose={() => setSelectedBatchId(null)}
                />
              </div>
            )}

            {!selectedBatch && (
              <div className="text-center py-12 rounded-xl border-2 border-dashed">
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a delivery from the left panel to view tactical details
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Real-time tracking and route optimization available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Activity Timeline */}
        <div className="bg-card border rounded-xl shadow-sm p-6">
          <ActivityTimeline batches={batches} />
        </div>
      </div>
    </Layout>
  );
};

export default CommandCenter;

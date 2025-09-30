import { useState } from 'react';
import { Facility, Warehouse, DeliveryBatch } from '@/types';
import KPIMetrics from './KPIMetrics';
import FleetStatus from './FleetStatus';
import MapView from './MapView';
import ActiveDeliveriesPanel from './ActiveDeliveriesPanel';
import AlertsPanel from './AlertsPanel';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface CommandCenterProps {
  facilities: Facility[];
  warehouses: Warehouse[];
  batches: DeliveryBatch[];
}

const CommandCenter = ({ facilities, warehouses, batches }: CommandCenterProps) => {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setLastRefresh(new Date());
    toast.success('Data refreshed', {
      description: `Updated at ${new Date().toLocaleTimeString()}`
    });
  };

  const handleBatchClick = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      toast.info(`Viewing ${batch.name}`, {
        description: `${batch.facilities.length} stops • ${batch.totalDistance}km`
      });
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

      {/* Map View */}
      <div className="w-full">
        <MapView
          facilities={facilities}
          warehouses={warehouses}
          batches={batches}
          center={[12.0, 8.5]}
          zoom={7}
        />
      </div>

      {/* Bottom Panels - Active Deliveries & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveDeliveriesPanel batches={batches} onBatchClick={handleBatchClick} />
        <AlertsPanel batches={batches} />
      </div>
    </div>
  );
};

export default CommandCenter;

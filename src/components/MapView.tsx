import { UnifiedMapContainer } from './map/UnifiedMapContainer';
import { useDrivers } from '@/hooks/useDrivers';
import type { Facility, Warehouse, RouteOptimization, DeliveryBatch } from '@/types';

interface MapViewProps {
  facilities: Facility[];
  warehouses?: Warehouse[];
  routes?: RouteOptimization[];
  batches?: DeliveryBatch[];
  selectedBatchId?: string | null;
  onBatchClick?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
}

const MapView = ({ 
  facilities, 
  warehouses = [], 
  routes = [], 
  batches = [], 
  selectedBatchId = null,
  onBatchClick,
  center,
  zoom,
}: MapViewProps) => {
  const { data: drivers = [] } = useDrivers();

  return (
    <UnifiedMapContainer
      mode="dashboard"
      facilities={facilities}
      warehouses={warehouses}
      drivers={drivers}
      routes={routes}
      batches={batches}
      selectedBatchId={selectedBatchId}
      center={center}
      zoom={zoom}
      tileProvider="standard"
      showToolbar={false}
      showBottomPanel={false}
      onBatchClick={onBatchClick}
      className="rounded-lg overflow-hidden shadow-card border"
    />
  );
};

export default MapView;
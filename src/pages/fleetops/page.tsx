import CommandCenter from '@/pages/CommandCenter';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';

export default function FleetOpsHome() {
  const { data: facilities = [] } = useFacilities();
  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.warehouses || [];
  const { data: batches = [] } = useDeliveryBatches();
  
  return (
    <CommandCenter 
      facilities={facilities}
      warehouses={warehouses}
      batches={batches}
    />
  );
}

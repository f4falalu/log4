import CommandCenter from '@/pages/CommandCenter';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';

export default function FleetOpsHome() {
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: batches = [] } = useDeliveryBatches();
  
  return (
    <CommandCenter 
      facilities={facilities}
      warehouses={warehouses}
      batches={batches}
    />
  );
}

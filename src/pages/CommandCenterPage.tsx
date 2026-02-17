import Layout from '@/components/layout/Layout';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import CommandCenter from '@/pages/CommandCenter';

export default function CommandCenterPage() {
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

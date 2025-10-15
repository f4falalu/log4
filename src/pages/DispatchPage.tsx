import { useFacilities } from '@/hooks/useFacilities';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import TacticalDispatchScheduler from '@/components/TacticalDispatchScheduler';

export default function DispatchPage() {
  const { data: facilities = [] } = useFacilities();
  const { data: batches = [] } = useDeliveryBatches();
  
  const handleBatchCreate = (batch: any) => {
    // This will be handled by TacticalDispatchScheduler's internal logic
    console.log('Batch created:', batch);
  };
  
  return (
    <TacticalDispatchScheduler 
      facilities={facilities}
      batches={batches}
      onBatchCreate={handleBatchCreate}
    />
  );
}

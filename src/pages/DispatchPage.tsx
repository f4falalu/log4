import Layout from '@/components/layout/Layout';
import { useFacilities } from '@/hooks/useFacilities';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import TacticalDispatchScheduler from '@/components/dispatch/TacticalDispatchScheduler';

export default function DispatchPage() {
  const { data: facilities = [] } = useFacilities();
  const { data: batches = [] } = useDeliveryBatches();
  
  const handleBatchCreate = (batch: any) => {
    console.log('Batch created:', batch);
  };
  
  return (
    <Layout>
      <TacticalDispatchScheduler 
        facilities={facilities}
        batches={batches}
        onBatchCreate={handleBatchCreate}
      />
    </Layout>
  );
}

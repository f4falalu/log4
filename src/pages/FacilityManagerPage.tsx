import Layout from '@/components/layout/Layout';
import FacilityManager from '@/pages/FacilityManager';
import { useFacilities } from '@/hooks/useFacilities';

export default function FacilityManagerPage() {
  const { data: facilitiesData, refetch } = useFacilities();
  const facilities = facilitiesData?.facilities || [];

  const handleUpdate = () => {
    refetch();
  };

  return (
    <Layout>
      <FacilityManager facilities={facilities} onFacilitiesUpdate={handleUpdate} />
    </Layout>
  );
}

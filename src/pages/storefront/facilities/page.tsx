import FacilityManager from '@/pages/FacilityManager';
import { useFacilities } from '@/hooks/useFacilities';

export default function StorefrontFacilities() {
  const { data: facilities = [], refetch } = useFacilities();

  const handleUpdate = () => {
    refetch();
  };

  return <FacilityManager facilities={facilities} onFacilitiesUpdate={handleUpdate} />;
}

import { useState } from 'react';
import { Delivery } from '@/types';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import { useFacilities } from '@/hooks/useFacilities';

export default function DashboardPage() {
  const [deliveries] = useState<Delivery[]>([]);
  const { data: facilities = [] } = useFacilities();

  return (
    <Layout>
      <Dashboard facilities={facilities} deliveries={deliveries} />
    </Layout>
  );
}

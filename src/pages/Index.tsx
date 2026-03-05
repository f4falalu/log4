import React from 'react';
const { useState } = React;
import { Delivery } from '@/types';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import { useFacilities } from '@/hooks/useFacilities';

const Index = () => {
  const [deliveries] = useState<Delivery[]>([]);
  const { data: facilitiesData } = useFacilities();
  const facilities = facilitiesData?.facilities || [];

  return (
    <Layout>
      <Dashboard facilities={facilities} deliveries={deliveries} />
    </Layout>
  );
};

export default Index;

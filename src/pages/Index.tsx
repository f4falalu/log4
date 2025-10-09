import React from 'react';
const { useState, useMemo } = React;
import { Delivery, DeliveryBatch } from '@/types';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import CommandCenter from '@/components/CommandCenter';
import FacilityManager from '@/components/FacilityManager';
import SchedulingForm from '@/components/SchedulingForm';
import TacticalDispatchScheduler from '@/components/TacticalDispatchScheduler';
import DeliveryList from '@/components/DeliveryList';
import BatchList from '@/components/BatchList';
import DriverManagement from '@/components/DriverManagement';
import VehicleManagement from '@/components/VehicleManagement';
import ReportsPage from '@/components/ReportsPage';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDeliveryBatches, useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import { useBatchUpdate } from '@/hooks/useBatchUpdate';
import { optimizeRoutes } from '@/lib/routeOptimization';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // Fetch data from database
  const { data: facilities = [], refetch: refetchFacilities } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: deliveryBatches = [] } = useDeliveryBatches();
  const createBatch = useCreateDeliveryBatch();

  // Calculate optimized routes
  const optimizedRoutes = useMemo(() => {
    if (facilities.length === 0 || warehouses.length === 0) return [];
    return optimizeRoutes(facilities, warehouses);
  }, [facilities, warehouses]);

  const handleFacilitiesUpdate = () => {
    refetchFacilities();
  };

  const handleDeliveryCreate = (delivery: Delivery) => {
    setDeliveries(prev => [...prev, delivery]);
  };

  const handleDeliveryUpdate = (deliveryId: string, updates: Partial<Delivery>) => {
    setDeliveries(prev => 
      prev.map(delivery => 
        delivery.id === deliveryId 
          ? { ...delivery, ...updates }
          : delivery
      )
    );
  };

  const handleBatchCreate = (batch: DeliveryBatch) => {
    createBatch.mutate(batch);
  };

  const updateBatch = useBatchUpdate();

  const handleBatchUpdate = (batchId: string, updates: Partial<DeliveryBatch>) => {
    updateBatch.mutate({ batchId, updates });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard facilities={facilities} deliveries={deliveries} />;
      case 'map':
        return (
          <CommandCenter
            facilities={facilities}
            warehouses={warehouses}
            batches={deliveryBatches}
          />
        );
      case 'facilities':
        return <FacilityManager facilities={facilities} onFacilitiesUpdate={handleFacilitiesUpdate} />;
      case 'schedule':
        return (
          <TacticalDispatchScheduler
            facilities={facilities}
            batches={deliveryBatches}
            onBatchCreate={handleBatchCreate}
          />
        );
      case 'drivers':
        return <DriverManagement />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'reports':
        return <ReportsPage />;
      case 'legacy-schedule':
        return <SchedulingForm facilities={facilities} deliveries={deliveries} onDeliveryCreate={handleDeliveryCreate} />;
      case 'deliveries':
        return <DeliveryList deliveries={deliveries} onDeliveryUpdate={handleDeliveryUpdate} />;
      case 'batches':
        return <BatchList batches={deliveryBatches} onBatchUpdate={handleBatchUpdate} />;
      default:
        return <Dashboard facilities={facilities} deliveries={deliveries} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;

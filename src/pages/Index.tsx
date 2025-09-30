import React from 'react';
const { useState, useMemo } = React;
import { Facility, Delivery, DeliveryBatch } from '@/types';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import CommandCenter from '@/components/CommandCenter';
import FacilityManager from '@/components/FacilityManager';
import SchedulingForm from '@/components/SchedulingForm';
import TacticalDispatchScheduler from '@/components/TacticalDispatchScheduler';
import DeliveryList from '@/components/DeliveryList';
import BatchList from '@/components/BatchList';
import { WAREHOUSES } from '@/data/warehouses';
import { optimizeRoutes } from '@/lib/routeOptimization';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatch[]>([]);

  // Calculate optimized routes
  const optimizedRoutes = useMemo(() => {
    if (facilities.length === 0) return [];
    return optimizeRoutes(facilities, WAREHOUSES);
  }, [facilities]);

  const handleFacilitiesUpdate = (newFacilities: Facility[]) => {
    setFacilities(newFacilities);
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
    setDeliveryBatches(prev => [...prev, batch]);
  };

  const handleBatchUpdate = (batchId: string, updates: Partial<DeliveryBatch>) => {
    setDeliveryBatches(prev => 
      prev.map(batch => 
        batch.id === batchId 
          ? { ...batch, ...updates }
          : batch
      )
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard facilities={facilities} deliveries={deliveries} />;
      case 'map':
        return (
          <CommandCenter
            facilities={facilities}
            warehouses={WAREHOUSES}
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

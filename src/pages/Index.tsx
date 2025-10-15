import React from 'react';
const { useState, useMemo, useEffect } = React;
import { useNavigate } from 'react-router-dom';
import { Delivery, DeliveryBatch } from '@/types';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import CommandCenter from '@/pages/CommandCenter';
import FacilityManager from '@/pages/FacilityManager';
import SchedulingForm from '@/components/dispatch/SchedulingForm';
import TacticalDispatchScheduler from '@/components/dispatch/TacticalDispatchScheduler';
import DeliveryList from '@/components/delivery/DeliveryList';
import BatchList from '@/components/delivery/BatchList';
import DriverManagement from '@/pages/DriverManagement';
import VehicleManagement from '@/pages/VehicleManagement';
import ReportsPage from '@/pages/ReportsPage';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useDeliveryBatches, useCreateDeliveryBatch } from '@/hooks/useDeliveryBatches';
import { useBatchUpdate } from '@/hooks/useBatchUpdate';
import { optimizeRoutes } from '@/lib/routeOptimization';
import { usePermissions } from '@/hooks/usePermissions';

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // Fetch data from database
  const { data: facilities = [], refetch: refetchFacilities } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const { data: deliveryBatches = [] } = useDeliveryBatches();
  const createBatch = useCreateDeliveryBatch();

  // Handle navigation for external routes
  useEffect(() => {
    if (activeTab === 'tactical-map') {
      navigate('/tactical-map');
    } else if (activeTab === 'drivers') {
      navigate('/drivers');
    }
  }, [activeTab, navigate]);

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

  const { hasPermission } = usePermissions();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard facilities={facilities} deliveries={deliveries} />;
      case 'map':
        return hasPermission('view_batches') ? (
          <CommandCenter
            facilities={facilities}
            warehouses={warehouses}
            batches={deliveryBatches}
          />
        ) : <AccessDenied />;
      case 'facilities':
        return hasPermission('manage_facilities') ? (
          <FacilityManager facilities={facilities} onFacilitiesUpdate={handleFacilitiesUpdate} />
        ) : <AccessDenied />;
      case 'schedule':
        return hasPermission('assign_drivers') ? (
          <TacticalDispatchScheduler
            facilities={facilities}
            batches={deliveryBatches}
            onBatchCreate={handleBatchCreate}
          />
        ) : <AccessDenied />;
      case 'drivers':
        return hasPermission('manage_drivers') ? (
          <DriverManagement />
        ) : <AccessDenied />;
      case 'vehicles':
        return hasPermission('manage_vehicles') ? (
          <VehicleManagement />
        ) : <AccessDenied />;
      case 'reports':
        return hasPermission('view_reports') ? (
          <ReportsPage />
        ) : <AccessDenied />;
      case 'legacy-schedule':
        return <SchedulingForm facilities={facilities} deliveries={deliveries} onDeliveryCreate={handleDeliveryCreate} />;
      case 'deliveries':
        return <DeliveryList deliveries={deliveries} onDeliveryUpdate={handleDeliveryUpdate} />;
      case 'batches':
        return hasPermission('view_batches') ? (
          <BatchList batches={deliveryBatches} onBatchUpdate={handleBatchUpdate} />
        ) : <AccessDenied />;
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

import React from 'react';
const { useState, useMemo } = React;
import { Facility, Delivery } from '@/types';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MapView from '@/components/MapView';
import FacilityManager from '@/components/FacilityManager';
import SchedulingForm from '@/components/SchedulingForm';
import DeliveryList from '@/components/DeliveryList';
import { WAREHOUSES } from '@/data/warehouses';
import { optimizeRoutes } from '@/lib/routeOptimization';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard facilities={facilities} deliveries={deliveries} />;
      case 'map':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Facility & Route Map</h2>
              <p className="text-muted-foreground">Interactive map showing facilities, warehouses, and optimized delivery routes</p>
            </div>
            <MapView 
              facilities={facilities}
              warehouses={WAREHOUSES}
              routes={optimizedRoutes}
              center={facilities.length > 0 ? [facilities[0].lat, facilities[0].lng] : [12.0, 8.5]}
              zoom={facilities.length > 1 ? 6 : 6}
            />
          </div>
        );
      case 'facilities':
        return <FacilityManager facilities={facilities} onFacilitiesUpdate={handleFacilitiesUpdate} />;
      case 'schedule':
        return <SchedulingForm facilities={facilities} deliveries={deliveries} onDeliveryCreate={handleDeliveryCreate} />;
      case 'deliveries':
        return <DeliveryList deliveries={deliveries} onDeliveryUpdate={handleDeliveryUpdate} />;
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

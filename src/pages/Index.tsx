import { useState } from 'react';
import { Facility, Delivery } from '@/types';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MapView from '@/components/MapView';
import FacilityManager from '@/components/FacilityManager';
import SchedulingForm from '@/components/SchedulingForm';
import DeliveryList from '@/components/DeliveryList';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

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
              <h2 className="text-2xl font-bold text-foreground mb-2">Facility Map View</h2>
              <p className="text-muted-foreground">Interactive map showing all registered facilities</p>
            </div>
            <MapView 
              facilities={facilities}
              center={facilities.length > 0 ? [facilities[0].lat, facilities[0].lng] : [39.8283, -98.5795]}
              zoom={facilities.length > 1 ? 6 : 4}
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

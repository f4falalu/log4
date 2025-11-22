/**
 * Vehicle Configurator Page
 * New single-screen vehicle onboarding interface
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VehicleConfigurator } from '@/components/vlms/vehicle-configurator/VehicleConfigurator';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VehicleConfigurePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createVehicle } = useVehiclesStore();

  const handleSave = async (formData: any) => {
    try {
      // Transform configurator data to match vehicle creation payload
      const vehicleData = {
        // Category & Type
        category_id: formData.category_id,
        vehicle_type_id: formData.vehicle_type_id,
        model: formData.model_name || 'Unknown',

        // Dimensions
        length_cm: formData.length_cm,
        width_cm: formData.width_cm,
        height_cm: formData.height_cm,
        capacity_m3: formData.capacity_m3,

        // Payload
        capacity_kg: formData.capacity_kg || 1000,

        // Tier configuration
        tiered_config: formData.tiered_config,

        // Required fields (will be enhanced in future with full registration form)
        license_plate: `TEMP-${Date.now()}`, // Temporary - will be replaced with actual registration
        vehicle_id: `VEH-${Date.now()}`,
        make: formData.model_name?.split(' ')[0] || 'Unknown',
        year: new Date().getFullYear(),
        fuel_type: 'diesel',
        status: 'available',
        acquisition_date: new Date().toISOString(),
        acquisition_type: 'purchase',
      };

      const result = await createVehicle(vehicleData);

      if (result) {
        toast({
          title: 'Vehicle Created',
          description: 'Vehicle configuration saved successfully',
        });

        // Redirect to vehicle detail page
        navigate(`/fleetops/vlms/vehicles/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create vehicle',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/fleetops/vlms/vehicles');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Vehicles
            </Button>

            <div>
              <h1 className="text-2xl font-bold">Vehicle Configurator</h1>
              <p className="text-sm text-muted-foreground">
                Configure your vehicle capacity and specifications
              </p>
            </div>
          </div>

          {/* Optional: Add help/info button here */}
        </div>
      </header>

      {/* Configurator */}
      <div className="flex-1 overflow-hidden">
        <VehicleConfigurator onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  );
}

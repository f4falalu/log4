/**
 * VLMS Vehicle Onboarding Page
 * Route: /fleetops/vlms/vehicles/onboard
 * Now uses single-screen configurator instead of multi-step wizard
 */

import { useNavigate } from 'react-router-dom';
import { VehicleConfigurator } from '@/components/vlms/vehicle-configurator/VehicleConfigurator';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VehicleOnboardPage() {
  const navigate = useNavigate();
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
        toast.success('Vehicle Created', {
          description: 'Vehicle configuration saved successfully',
        });

        // Redirect to vehicle detail page
        navigate(`/fleetops/vlms/vehicles/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      toast.error('Creation Failed', {
        description: error instanceof Error ? error.message : 'Failed to create vehicle',
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vehicles
          </Button>

          <div>
            <h1 className="text-2xl font-bold">Vehicle Onboarding</h1>
            <p className="text-sm text-muted-foreground">
              Configure your vehicle capacity and specifications
            </p>
          </div>
        </div>
      </header>

      {/* Configurator */}
      <div className="flex-1 overflow-hidden">
        <VehicleConfigurator onSave={handleSave} onCancel={handleCancel} />
      </div>
    </div>
  );
}

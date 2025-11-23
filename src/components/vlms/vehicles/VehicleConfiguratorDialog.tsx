/**
 * Vehicle Configurator Dialog
 * Modal wrapper for the Tesla/Arrival-inspired vehicle configurator
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VehicleConfigurator } from '@/components/vlms/vehicle-configurator/VehicleConfigurator';
import { useVehiclesStore } from '@/stores/vlms/vehiclesStore';
import { toast } from 'sonner';

interface VehicleConfiguratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleConfiguratorDialog({
  open,
  onOpenChange,
}: VehicleConfiguratorDialogProps) {
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
        gross_weight_kg: formData.gross_weight_kg,
        capacity_kg: formData.capacity_kg,

        // Tier configuration
        tiered_config: formData.tiered_config,

        // Basic Information (from user input)
        vehicle_id: formData.vehicle_name ? formData.vehicle_name.toUpperCase().replace(/\s+/g, '-') : `VEH-${Date.now()}`,
        variant: formData.variant,

        // Specifications (from user input)
        make: formData.model_name?.split(' ')[0] || 'Unknown',
        vehicle_type: formData.model_name || 'truck', // Legacy VARCHAR field (required)
        year: formData.year, // Validated in isValid()
        fuel_type: formData.fuel_type, // Validated in isValid()
        transmission: formData.transmission,
        axles: formData.axles,
        number_of_wheels: formData.number_of_wheels,

        // Acquisition (from user input)
        acquisition_date: formData.acquisition_date, // Validated in isValid()
        acquisition_type: formData.acquisition_type, // Validated in isValid()
        vendor_name: formData.vendor,

        // Insurance & Registration (from user input)
        license_plate: formData.license_plate, // Validated in isValid()
        registration_expiry: formData.registration_expiry,
        insurance_expiry: formData.insurance_expiry,

        // Interior (from user input)
        interior_length_cm: formData.interior_length_cm,
        interior_width_cm: formData.interior_width_cm,
        interior_height_cm: formData.interior_height_cm,
        seating_capacity: formData.seating_capacity,

        // Status
        status: 'available',
      };

      const result = await createVehicle(vehicleData);

      if (result) {
        toast.success('Vehicle Created', {
          description: 'Vehicle configuration saved successfully',
        });

        // Close dialog
        onOpenChange(false);

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Configure New Vehicle</DialogTitle>
          <DialogDescription>
            Select category and configure capacity specifications
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden">
          <VehicleConfigurator onSave={handleSave} onCancel={handleCancel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

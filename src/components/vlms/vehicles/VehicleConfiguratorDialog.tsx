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

      // Ensure all required fields have valid values
      const currentYear = new Date().getFullYear();

      // Transform configurator data to match vehicle creation payload
      const vehicleData = {
        // Category & Type
        category_id: formData.category_id,
        vehicle_type_id: formData.vehicle_type_id,
        model: formData.model_name || 'Unknown',
        make: formData.model_name?.split(' ')[0] || 'Unknown',

        // Dimensions
        length_cm: formData.length_cm,
        width_cm: formData.width_cm,
        height_cm: formData.height_cm,
        capacity_m3: formData.capacity_m3,

        // Payload
        gross_weight_kg: formData.gross_weight_kg,
        capacity_kg: formData.capacity_kg,

        // Legacy required fields (for old vehicles table schema)
        capacity: formData.capacity_m3 || 0, // Legacy capacity field (cubic meters)
        max_weight: formData.gross_weight_kg || formData.capacity_kg || 0, // Legacy max weight
        fuel_efficiency: 0, // Default value for required legacy field

        // Tier configuration - ensure proper format or set to null
        tiered_config: (formData.tiered_config && formData.tiered_config.tiers && formData.tiered_config.tiers.length > 0)
          ? formData.tiered_config
          : null,

        // Basic Information (from user input) - REQUIRED FIELDS
        vehicle_id: formData.vehicle_name ? formData.vehicle_name.toUpperCase().replace(/\s+/g, '-') : `VEH-${Date.now()}`,
        variant: formData.variant,

        // REQUIRED: vehicle_type must be valid enum value (VLMS column)
        vehicle_type: (formData.vehicle_type && ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'other'].includes(formData.vehicle_type))
          ? formData.vehicle_type
          : 'truck', // Default to truck

        // REQUIRED: type must match vehicle_type (legacy column - still required by DB)
        type: (formData.vehicle_type && ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'other'].includes(formData.vehicle_type))
          ? formData.vehicle_type
          : 'truck',

        // REQUIRED: year must be a valid number
        year: (formData.year && typeof formData.year === 'number')
          ? formData.year
          : currentYear,

        // REQUIRED: fuel_type must be valid enum value
        fuel_type: (formData.fuel_type && ['gasoline', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'].includes(formData.fuel_type))
          ? formData.fuel_type
          : 'diesel', // Default to diesel

        // REQUIRED: transmission
        transmission: (formData.transmission && ['automatic', 'manual', 'cvt', 'dct'].includes(formData.transmission))
          ? formData.transmission
          : 'manual', // Default to manual

        // Optional specs
        axles: formData.axles,
        number_of_wheels: formData.number_of_wheels,

        // REQUIRED: Acquisition info
        acquisition_date: formData.acquisition_date || new Date().toISOString().split('T')[0], // Default to today
        acquisition_type: (formData.acquisition_type && ['purchase', 'lease', 'donation', 'transfer'].includes(formData.acquisition_type))
          ? formData.acquisition_type
          : 'purchase', // Default to purchase
        vendor_name: formData.vendor,

        // REQUIRED: license_plate (VLMS column)
        license_plate: formData.license_plate || `TEMP-${Date.now().toString().slice(-6)}`, // Generate temp plate if missing

        // REQUIRED: plate_number (legacy column - must match license_plate)
        plate_number: formData.license_plate || `TEMP-${Date.now().toString().slice(-6)}`,

        // Optional Insurance & Registration (convert empty strings to null for date fields)
        registration_expiry: formData.registration_expiry || null,
        insurance_expiry: formData.insurance_expiry || null,

        // Interior (from user input)
        interior_length_cm: formData.interior_length_cm,
        interior_width_cm: formData.interior_width_cm,
        interior_height_cm: formData.interior_height_cm,
        seating_capacity: formData.seating_capacity,

        // Status
        status: 'available' as const,

        // Current mileage (required by store)
        current_mileage: 0,

        // Array fields (required by schema - default to empty arrays)
        tags: [],
        documents: [],
        photos: [],
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
        <VehicleConfigurator onSave={handleSave} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}

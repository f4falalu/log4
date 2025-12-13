import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { VehicleFormData } from '@/lib/vlms/validationSchemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BasicInfoSectionProps {
  register: UseFormRegister<VehicleFormData>;
  errors: FieldErrors<VehicleFormData>;
  setValue: (name: any, value: any) => void;
  watch: (name: any) => any;
}

export function BasicInfoSection({ register, errors, setValue, watch }: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">
            Make <span className="text-destructive">*</span>
          </Label>
          <Input
            id="make"
            {...register('make')}
            placeholder="Toyota, Ford, etc."
          />
          {errors.make && (
            <p className="text-sm text-destructive">{errors.make.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">
            Model <span className="text-destructive">*</span>
          </Label>
          <Input
            id="model"
            {...register('model')}
            placeholder="Camry, F-150, etc."
          />
          {errors.model && (
            <p className="text-sm text-destructive">{errors.model.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">
            Year <span className="text-destructive">*</span>
          </Label>
          <Input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            placeholder="2024"
          />
          {errors.year && (
            <p className="text-sm text-destructive">{errors.year.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vin">VIN</Label>
          <Input
            id="vin"
            {...register('vin')}
            placeholder="Vehicle Identification Number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="license_plate">
            License Plate <span className="text-destructive">*</span>
          </Label>
          <Input
            id="license_plate"
            {...register('license_plate')}
            placeholder="ABC-1234"
          />
          {errors.license_plate && (
            <p className="text-sm text-destructive">{errors.license_plate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicle_type">
            Vehicle Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch('vehicle_type')}
            onValueChange={(value) => setValue('vehicle_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.vehicle_type && (
            <p className="text-sm text-destructive">{errors.vehicle_type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

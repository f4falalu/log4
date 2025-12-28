/**
 * VLMS Vehicle Onboarding - Registration Form Component
 * Step 4: Enter vehicle registration and identification details
 */

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useVehicleOnboardState } from '@/hooks/useVehicleOnboardState';

export function RegistrationForm() {
  const registrationData = useVehicleOnboardState((state) => state.registrationData);
  const updateRegistrationData = useVehicleOnboardState((state) => state.updateRegistrationData);
  const goToNextStep = useVehicleOnboardState((state) => state.goToNextStep);
  const goToPreviousStep = useVehicleOnboardState((state) => state.goToPreviousStep);
  const canGoNext = useVehicleOnboardState((state) => state.canGoNext());

  const handleChange = (field: string, value: any) => {
    updateRegistrationData({ [field]: value });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Registration Details</CardTitle>
        <CardDescription>
          Enter vehicle identification, insurance, and operational information.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Identification */}
        <div className="space-y-4">
          <h3 className="font-semibold">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">
                Make <span className="text-destructive">*</span>
              </Label>
              <Input
                id="make"
                placeholder="e.g., Toyota"
                value={registrationData.make}
                onChange={(e) => handleChange('make', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                placeholder="e.g., Hiace"
                value={registrationData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                id="year"
                type="number"
                placeholder={new Date().getFullYear().toString()}
                value={registrationData.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value))}
                min={1900}
                max={new Date().getFullYear() + 1}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g., White"
                value={registrationData.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Registration & Identification */}
        <div className="space-y-4">
          <h3 className="font-semibold">Registration & Identification</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="license-plate">
                License Plate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="license-plate"
                placeholder="e.g., ABC-123-XY"
                value={registrationData.license_plate}
                onChange={(e) => handleChange('license_plate', e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN (Vehicle Identification Number)</Label>
              <Input
                id="vin"
                placeholder="17-character VIN"
                value={registrationData.vin || ''}
                onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                maxLength={17}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration-expiry">Registration Expiry</Label>
              <Input
                id="registration-expiry"
                type="date"
                value={registrationData.registration_expiry || ''}
                onChange={(e) => handleChange('registration_expiry', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-mileage">Current Mileage (km)</Label>
              <Input
                id="current-mileage"
                type="number"
                placeholder="0"
                value={registrationData.current_mileage || 0}
                onChange={(e) => handleChange('current_mileage', parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Vehicle Specifications */}
        <div className="space-y-4">
          <h3 className="font-semibold">Specifications</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <Select
                value={registrationData.fuel_type || ''}
                onValueChange={(value) => handleChange('fuel_type', value)}
              >
                <SelectTrigger id="fuel-type">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transmission">Transmission</Label>
              <Select
                value={registrationData.transmission || ''}
                onValueChange={(value) => handleChange('transmission', value)}
              >
                <SelectTrigger id="transmission">
                  <SelectValue placeholder="Select transmission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                  <SelectItem value="dct">DCT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="engine-capacity">Engine Capacity (cc)</Label>
              <Input
                id="engine-capacity"
                type="number"
                placeholder="e.g., 2000"
                value={registrationData.engine_capacity || ''}
                onChange={(e) => handleChange('engine_capacity', parseFloat(e.target.value) || undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seating-capacity">Seating Capacity</Label>
              <Input
                id="seating-capacity"
                type="number"
                placeholder="e.g., 2"
                value={registrationData.seating_capacity || ''}
                onChange={(e) => handleChange('seating_capacity', parseInt(e.target.value) || undefined)}
                min={1}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Acquisition Details */}
        <div className="space-y-4">
          <h3 className="font-semibold">Acquisition</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisition-date">Acquisition Date</Label>
              <Input
                id="acquisition-date"
                type="date"
                value={registrationData.acquisition_date}
                onChange={(e) => handleChange('acquisition_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisition-type">Acquisition Type</Label>
              <Select
                value={registrationData.acquisition_type}
                onValueChange={(value) => handleChange('acquisition_type', value)}
              >
                <SelectTrigger id="acquisition-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-price">Purchase Price</Label>
              <Input
                id="purchase-price"
                type="number"
                placeholder="0.00"
                value={registrationData.purchase_price || ''}
                onChange={(e) => handleChange('purchase_price', parseFloat(e.target.value) || undefined)}
                min={0}
                step={0.01}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor/Supplier Name</Label>
              <Input
                id="vendor-name"
                placeholder="e.g., ABC Motors"
                value={registrationData.vendor_name || ''}
                onChange={(e) => handleChange('vendor_name', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Insurance */}
        <div className="space-y-4">
          <h3 className="font-semibold">Insurance</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurance-provider">Insurance Provider</Label>
              <Input
                id="insurance-provider"
                placeholder="e.g., XYZ Insurance"
                value={registrationData.insurance_provider || ''}
                onChange={(e) => handleChange('insurance_provider', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance-policy">Policy Number</Label>
              <Input
                id="insurance-policy"
                placeholder="Policy number"
                value={registrationData.insurance_policy_number || ''}
                onChange={(e) => handleChange('insurance_policy_number', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance-expiry">Insurance Expiry</Label>
              <Input
                id="insurance-expiry"
                type="date"
                value={registrationData.insurance_expiry || ''}
                onChange={(e) => handleChange('insurance_expiry', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Status & Notes */}
        <div className="space-y-4">
          <h3 className="font-semibold">Status & Notes</h3>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={registrationData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this vehicle..."
                value={registrationData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={goToPreviousStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button onClick={goToNextStep} disabled={!canGoNext} size="lg">
          Next: Review & Submit
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

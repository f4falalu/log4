import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Constants } from '@/types/supabase';
import {
  vendorRegistrationSchema,
  type VendorRegistrationInput,
  getOrganizationTypeLabel,
  getVendorRoleLabel,
  getVendorServiceLabel,
} from '@/lib/validations/vendor';
import type { Vendor } from '@/hooks/useVendors';

const ORGANIZATION_TYPES = Constants.public.Enums.organization_type;
const VENDOR_ROLES = Constants.public.Enums.vendor_role;
const VENDOR_SERVICES = Constants.public.Enums.vendor_service;

interface VendorRegistrationFormProps {
  vendor?: Vendor | null;
  onSubmit: (data: VendorRegistrationInput) => Promise<void>;
  onCancel: () => void;
}

export function VendorRegistrationForm({
  vendor,
  onSubmit,
  onCancel,
}: VendorRegistrationFormProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    vendor?.vendor_roles || []
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(
    vendor?.services_offered || []
  );

  const isEditing = !!vendor;

  // Check if services are required based on selected roles
  const requiresServices = selectedRoles.some(
    (role) => role === 'service_vendor' || role === 'partner'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);

    const data: VendorRegistrationInput = {
      name: formData.get('name') as string,
      organization_type: formData.get('organization_type') as any,
      vendor_roles: selectedRoles as any[],
      country: formData.get('country') as string || undefined,
      state: formData.get('state') as string || undefined,
      lga: formData.get('lga') as string || undefined,
      address: formData.get('address') as string || undefined,
      organization_lead_name: formData.get('organization_lead_name') as string,
      organization_lead_title: formData.get('organization_lead_title') as string || undefined,
      primary_email: formData.get('primary_email') as string || undefined,
      primary_phone: formData.get('primary_phone') as string || undefined,
      services_offered: selectedServices.length > 0 ? selectedServices as any[] : undefined,
      internal_notes: formData.get('internal_notes') as string || undefined,
    };

    // Validate with Zod schema
    try {
      const validated = vendorRegistrationSchema.parse(data);
      await onSubmit(validated);
    } catch (error: any) {
      console.error('Validation error:', error);
      // Show validation errors
      if (error.errors) {
        alert(error.errors.map((e: any) => e.message).join('\n'));
      }
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Organization Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Organization Information</h3>

        <div className="space-y-2">
          <Label htmlFor="name">
            Organization Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={vendor?.name || ''}
            required
            placeholder="Enter organization name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization_type">
            Organization Type <span className="text-destructive">*</span>
          </Label>
          <Select name="organization_type" defaultValue={vendor?.organization_type || ''} required>
            <SelectTrigger>
              <SelectValue placeholder="Select organization type" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {getOrganizationTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              defaultValue={vendor?.country || ''}
              placeholder="e.g., Nigeria"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              defaultValue={vendor?.state || ''}
              placeholder="e.g., Lagos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lga">LGA</Label>
            <Input
              id="lga"
              name="lga"
              defaultValue={vendor?.lga || ''}
              placeholder="e.g., Ikeja"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Full Address</Label>
          <Input
            id="address"
            name="address"
            defaultValue={vendor?.address || ''}
            placeholder="Enter full address"
          />
        </div>
      </div>

      {/* Section 2: Primary Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Primary Contact</h3>

        <div className="space-y-2">
          <Label htmlFor="organization_lead_name">
            Organization Lead Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="organization_lead_name"
            name="organization_lead_name"
            defaultValue={vendor?.organization_lead_name || vendor?.contact_name || ''}
            required
            placeholder="Enter lead name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization_lead_title">Organization Lead Title</Label>
          <Input
            id="organization_lead_title"
            name="organization_lead_title"
            defaultValue={vendor?.organization_lead_title || ''}
            placeholder="e.g., Director, CEO, Coordinator"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary_email">
              Primary Email <span className="text-muted-foreground">(required if no phone)</span>
            </Label>
            <Input
              id="primary_email"
              name="primary_email"
              type="email"
              defaultValue={vendor?.primary_email || vendor?.email || ''}
              placeholder="email@organization.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_phone">
              Primary Phone <span className="text-muted-foreground">(required if no email)</span>
            </Label>
            <Input
              id="primary_phone"
              name="primary_phone"
              type="tel"
              defaultValue={vendor?.primary_phone || vendor?.contact_phone || ''}
              placeholder="+234 XXX XXX XXXX"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Role & Capability */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Role & Capability</h3>

        <div className="space-y-2">
          <Label>
            Vendor Roles <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Select all applicable roles (at least one required)
          </p>
          <div className="space-y-2 border rounded-md p-4">
            {VENDOR_ROLES.map((role) => (
              <div key={role} className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role}`}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => handleRoleToggle(role)}
                />
                <div className="space-y-1">
                  <label
                    htmlFor={`role-${role}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {getVendorRoleLabel(role)}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {role === 'client' && 'Receives services / deliveries'}
                    {role === 'partner' && 'Collaborates or co-executes'}
                    {role === 'service_vendor' && 'Provides fleet, drivers, warehousing, etc.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-sm text-destructive">At least one role must be selected</p>
          )}
        </div>

        {requiresServices && (
          <div className="space-y-2">
            <Label>
              Services Offered <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Required when vendor role includes "Service Vendor" or "Partner"
            </p>
            <div className="space-y-2 border rounded-md p-4">
              {VENDOR_SERVICES.map((service) => (
                <div key={service} className="flex items-start space-x-3">
                  <Checkbox
                    id={`service-${service}`}
                    checked={selectedServices.includes(service)}
                    onCheckedChange={() => handleServiceToggle(service)}
                  />
                  <label
                    htmlFor={`service-${service}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {getVendorServiceLabel(service)}
                  </label>
                </div>
              ))}
            </div>
            {requiresServices && selectedServices.length === 0 && (
              <p className="text-sm text-destructive">
                At least one service must be selected for service vendors or partners
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Internal Notes (Optional) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Internal Notes</h3>

        <div className="space-y-2">
          <Label htmlFor="internal_notes">Notes (Internal Use Only)</Label>
          <Textarea
            id="internal_notes"
            name="internal_notes"
            defaultValue={vendor?.internal_notes || ''}
            placeholder="Add any internal notes or comments about this vendor..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{isEditing ? 'Update Vendor' : 'Create Vendor'}</Button>
      </div>
    </form>
  );
}

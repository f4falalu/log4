import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Warehouse, WarehouseFormData } from '@/types/warehouse';
import { useCreateWarehouse, useUpdateWarehouse } from '@/hooks/useWarehouses';

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  operating_hours: z.string().min(1, 'Operating hours are required'),
  total_capacity_m3: z.coerce.number().min(0).optional(),
  is_active: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) {
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const isEditing = !!warehouse;

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      country: '',
      lat: undefined,
      lng: undefined,
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      operating_hours: '',
      total_capacity_m3: undefined,
      is_active: true,
    },
  });

  useEffect(() => {
    if (warehouse) {
      form.reset({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        country: warehouse.country || '',
        lat: warehouse.lat,
        lng: warehouse.lng,
        contact_name: warehouse.contact_name || '',
        contact_phone: warehouse.contact_phone || '',
        contact_email: warehouse.contact_email || '',
        operating_hours: warehouse.operating_hours || '',
        total_capacity_m3: warehouse.total_capacity_m3,
        is_active: warehouse.is_active,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        country: '',
        lat: undefined,
        lng: undefined,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        operating_hours: '',
        total_capacity_m3: undefined,
        is_active: true,
      });
    }
  }, [warehouse, form]);

  const onSubmit = async (values: WarehouseFormValues) => {
    const formData: WarehouseFormData = {
      name: values.name,
      code: values.code,
      address: values.address || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      country: values.country || undefined,
      lat: values.lat,
      lng: values.lng,
      contact_name: values.contact_name || undefined,
      contact_phone: values.contact_phone || undefined,
      contact_email: values.contact_email || undefined,
      operating_hours: values.operating_hours || undefined,
      total_capacity_m3: values.total_capacity_m3,
    };

    try {
      if (isEditing && warehouse) {
        await updateWarehouse.mutateAsync({ id: warehouse.id, data: formData });
      } else {
        await createWarehouse.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createWarehouse.isPending || updateWarehouse.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? 'Update warehouse details' : 'Fill in the details to add a new warehouse'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <form id="warehouse-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Warehouse name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    {...form.register('code')}
                    placeholder="e.g., WH-001"
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive warehouses won't appear in selections
                  </p>
                </div>
                <Switch
                  checked={form.watch('is_active')}
                  onCheckedChange={(checked) => form.setValue('is_active', checked)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Location</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="Street address"
                />
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...form.register('state')}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...form.register('country')}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    {...form.register('lat')}
                    placeholder="e.g., 9.0765"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    {...form.register('lng')}
                    placeholder="e.g., 7.3986"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    {...form.register('contact_name')}
                    placeholder="Contact person"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    {...form.register('contact_phone')}
                    placeholder="+234..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...form.register('contact_email')}
                    placeholder="email@example.com"
                  />
                  {form.formState.errors.contact_email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.contact_email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operating_hours">Operating Hours *</Label>
                  <Input
                    id="operating_hours"
                    {...form.register('operating_hours')}
                    placeholder="e.g., Mon-Fri 8am-6pm"
                  />
                  {form.formState.errors.operating_hours && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.operating_hours.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Capacity</h3>

              <div className="space-y-2">
                <Label htmlFor="total_capacity_m3">Total Capacity (m³)</Label>
                <Input
                  id="total_capacity_m3"
                  type="number"
                  step="0.01"
                  {...form.register('total_capacity_m3')}
                  placeholder="0.00"
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="warehouse-form" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Warehouse' : 'Create Warehouse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

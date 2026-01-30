import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Item, ItemCategory, ItemFormData, ItemProgram } from '@/types/items';
import { ITEM_CATEGORIES, ITEM_PROGRAMS } from '@/types/items';
import { useCreateItem, useUpdateItem } from '@/hooks/useItems';

const itemSchema = z.object({
  serial_number: z.string().min(1, 'Serial number is required'),
  description: z.string().min(1, 'Description is required'),
  unit_pack: z.string().min(1, 'Unit pack is required'),
  category: z.enum(ITEM_CATEGORIES as [ItemCategory, ...ItemCategory[]]),
  program: z.enum(ITEM_PROGRAMS as [ItemProgram, ...ItemProgram[]]).optional(),
  weight_kg: z.coerce.number().optional(),
  volume_m3: z.coerce.number().optional(),
  batch_number: z.string().optional(),
  mfg_date: z.string().optional(),
  expiry_date: z.string().optional(),
  store_address: z.string().optional(),
  lot_number: z.string().optional(),
  stock_on_hand: z.coerce.number().min(0, 'Stock cannot be negative'),
  unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
  warehouse_id: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
}

export function ItemFormDialog({ open, onOpenChange, item }: ItemFormDialogProps) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isEditing = !!item;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      serial_number: '',
      description: '',
      unit_pack: '',
      category: 'Tablet',
      program: undefined,
      weight_kg: undefined,
      volume_m3: undefined,
      batch_number: '',
      mfg_date: '',
      expiry_date: '',
      store_address: '',
      lot_number: '',
      stock_on_hand: 0,
      unit_price: 0,
      warehouse_id: '',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        serial_number: item.serial_number,
        description: item.description,
        unit_pack: item.unit_pack || '',
        category: item.category,
        program: item.program,
        weight_kg: item.weight_kg,
        volume_m3: item.volume_m3,
        batch_number: item.batch_number || '',
        mfg_date: item.mfg_date || '',
        expiry_date: item.expiry_date || '',
        store_address: item.store_address || '',
        lot_number: item.lot_number || '',
        stock_on_hand: item.stock_on_hand,
        unit_price: item.unit_price,
        warehouse_id: item.warehouse_id || '',
      });
    } else {
      form.reset({
        serial_number: '',
        description: '',
        unit_pack: '',
        category: 'Tablet',
        program: undefined,
        weight_kg: undefined,
        volume_m3: undefined,
        batch_number: '',
        mfg_date: '',
        expiry_date: '',
        store_address: '',
        lot_number: '',
        stock_on_hand: 0,
        unit_price: 0,
        warehouse_id: '',
      });
    }
  }, [item, form]);

  const onSubmit = async (values: ItemFormValues) => {
    const formData: ItemFormData = {
      ...values,
      program: values.program || undefined,
      weight_kg: values.weight_kg || undefined,
      volume_m3: values.volume_m3 || undefined,
      batch_number: values.batch_number || undefined,
      mfg_date: values.mfg_date || undefined,
      expiry_date: values.expiry_date || undefined,
      store_address: values.store_address || undefined,
      lot_number: values.lot_number || undefined,
      warehouse_id: values.warehouse_id || undefined,
    };

    try {
      if (isEditing && item) {
        await updateItem.mutateAsync({ id: item.id, data: formData });
      } else {
        await createItem.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-140px)]">
          <form id="item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pr-4 pb-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number *</Label>
                  <Input
                    id="serial_number"
                    {...form.register('serial_number')}
                    placeholder="e.g., SN-001"
                  />
                  {form.formState.errors.serial_number && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.serial_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(value) => form.setValue('category', value as ItemCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Select
                  value={form.watch('program') || ''}
                  onValueChange={(value) => form.setValue('program', value as ItemProgram || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_PROGRAMS.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  {...form.register('description')}
                  placeholder="Item description"
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_pack">Unit Pack *</Label>
                  <Input
                    id="unit_pack"
                    {...form.register('unit_pack')}
                    placeholder="e.g., 10 tablets/pack"
                  />
                  {form.formState.errors.unit_pack && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.unit_pack.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_address">Store Address</Label>
                  <Input
                    id="store_address"
                    {...form.register('store_address')}
                    placeholder="Storage location"
                  />
                </div>
              </div>
            </div>

            {/* Measurements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Measurements</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.01"
                    {...form.register('weight_kg')}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume_m3">Volume (m³)</Label>
                  <Input
                    id="volume_m3"
                    type="number"
                    step="0.0001"
                    {...form.register('volume_m3')}
                    placeholder="0.0000"
                  />
                </div>
              </div>
            </div>

            {/* Batch Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Batch Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input
                    id="batch_number"
                    {...form.register('batch_number')}
                    placeholder="e.g., BTH-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lot_number">Lot Number</Label>
                  <Input
                    id="lot_number"
                    {...form.register('lot_number')}
                    placeholder="e.g., LOT-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mfg_date">Manufacturing Date</Label>
                  <Input
                    id="mfg_date"
                    type="date"
                    {...form.register('mfg_date')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    {...form.register('expiry_date')}
                  />
                </div>
              </div>
            </div>

            {/* Stock & Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Stock & Pricing</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_on_hand">Stock on Hand *</Label>
                  <Input
                    id="stock_on_hand"
                    type="number"
                    {...form.register('stock_on_hand')}
                    placeholder="0"
                  />
                  {form.formState.errors.stock_on_hand && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.stock_on_hand.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price (NGN) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    {...form.register('unit_price')}
                    placeholder="0.00"
                  />
                  {form.formState.errors.unit_price && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.unit_price.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

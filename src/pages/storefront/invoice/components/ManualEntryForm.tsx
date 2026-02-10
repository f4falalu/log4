import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useFacilities } from '@/hooks/useFacilities';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { ITEM_CATEGORIES } from '@/types/items';
import type { ItemCategory } from '@/types/items';
import type { InvoiceFormData } from '@/types/invoice';

const headerSchema = z.object({
  ref_number: z.string().optional(),
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  facility_id: z.string().min(1, 'Facility is required'),
  packaging_required: z.boolean().default(false),
  notes: z.string().optional(),
});

type HeaderValues = z.infer<typeof headerSchema>;

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  weight_kg: number | undefined;
  volume_m3: number | undefined;
  category: ItemCategory | undefined;
  batch_number: string | undefined;
}

function createEmptyItem(): LineItem {
  return {
    description: '',
    quantity: 1,
    unit_price: 0,
    weight_kg: undefined,
    volume_m3: undefined,
    category: undefined,
    batch_number: undefined,
  };
}

interface ManualEntryFormProps {
  onClose: () => void;
}

export function ManualEntryForm({ onClose }: ManualEntryFormProps) {
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const createInvoice = useCreateInvoice();

  const { data: warehousesData } = useWarehouses();
  const { data: facilitiesData } = useFacilities();

  const warehouses = warehousesData?.warehouses || [];
  const facilities = facilitiesData?.facilities || [];

  const form = useForm<HeaderValues>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      ref_number: '',
      warehouse_id: '',
      facility_id: '',
      packaging_required: false,
      notes: '',
    },
  });

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number | undefined) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const validItems = items.filter(item => item.description.trim() && item.quantity > 0 && item.unit_price >= 0);

  const totals = {
    count: items.length,
    price: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    weight: items.reduce((sum, item) => sum + (item.weight_kg || 0), 0),
    volume: items.reduce((sum, item) => sum + (item.volume_m3 || 0), 0),
  };

  const onSubmit = async (header: HeaderValues) => {
    if (validItems.length === 0) return;

    const formData: InvoiceFormData = {
      ref_number: header.ref_number || undefined,
      warehouse_id: header.warehouse_id,
      facility_id: header.facility_id,
      notes: header.notes || undefined,
      items: validItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        weight_kg: item.weight_kg,
        volume_m3: item.volume_m3,
        category: item.category,
        batch_number: item.batch_number,
      })),
    };

    try {
      await createInvoice.mutateAsync(formData);
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <ScrollArea className="flex-1 pr-4">
        <form id="manual-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
          {/* Header Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Invoice Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse_id">Source Warehouse *</Label>
                <Select
                  value={form.watch('warehouse_id')}
                  onValueChange={(value) => form.setValue('warehouse_id', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name} {wh.code ? `(${wh.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouse_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.warehouse_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility_id">Destination Facility *</Label>
                <Select
                  value={form.watch('facility_id')}
                  onValueChange={(value) => form.setValue('facility_id', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.facility_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.facility_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref_number">Reference Number</Label>
                <Input
                  {...form.register('ref_number')}
                  placeholder="Optional reference"
                />
              </div>

              <div className="flex items-center justify-between pt-6">
                <div className="space-y-0.5">
                  <Label>Packaging Required</Label>
                  <p className="text-xs text-muted-foreground">Needs packaging before dispatch</p>
                </div>
                <Switch
                  checked={form.watch('packaging_required')}
                  onCheckedChange={(checked) => form.setValue('packaging_required', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Description *</TableHead>
                      <TableHead className="w-[90px]">Qty *</TableHead>
                      <TableHead className="w-[110px]">Unit Price *</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
                      <TableHead className="w-[90px]">Weight (kg)</TableHead>
                      <TableHead className="w-[90px]">Vol (m³)</TableHead>
                      <TableHead className="w-[130px]">Category</TableHead>
                      <TableHead className="w-[110px]">Batch No.</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No items added. Click "Add Item" to begin.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Item description"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {(item.quantity * item.unit_price).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.weight_kg ?? ''}
                              onChange={(e) => handleItemChange(index, 'weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder="0.0"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.volume_m3 ?? ''}
                              onChange={(e) => handleItemChange(index, 'volume_m3', e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder="0.0"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.category || '__none__'}
                              onValueChange={(value) => handleItemChange(index, 'category', value === '__none__' ? undefined : value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">--</SelectItem>
                                {ITEM_CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.batch_number ?? ''}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value || undefined)}
                              placeholder="Batch"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 p-0"
                              disabled={items.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>{totals.count} item(s)</span>
                <span>Total: {totals.price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 })}</span>
                {totals.weight > 0 && <span>{totals.weight.toFixed(1)} kg</span>}
                {totals.volume > 0 && <span>{totals.volume.toFixed(2)} m³</span>}
              </div>
            )}
          </div>
        </form>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="manual-invoice-form"
          disabled={validItems.length === 0 || createInvoice.isPending}
        >
          {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
}

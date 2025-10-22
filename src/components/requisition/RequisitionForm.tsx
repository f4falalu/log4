import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RequisitionFormProps {
  facilities: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface RequisitionItem {
  item_name: string;
  item_code: string;
  quantity: number;
  pack_size: string;
  unit: string;
  weight_kg: number;
  volume_m3: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

export function RequisitionForm({ facilities, onSubmit, onCancel, isLoading }: RequisitionFormProps) {
  const [formData, setFormData] = useState({
    facility_id: '',
    requisition_type: 'routine' as 'routine' | 'emergency',
    expected_delivery_date: '',
    notes: ''
  });

  const [items, setItems] = useState<RequisitionItem[]>([
    {
      item_name: '',
      item_code: '',
      quantity: 1,
      pack_size: '',
      unit: 'pieces',
      weight_kg: 0,
      volume_m3: 0,
      unit_price: 0,
      total_price: 0,
      notes: ''
    }
  ]);

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const handleAddItem = () => {
    setItems([...items, {
      item_name: '',
      item_code: '',
      quantity: 1,
      pack_size: '',
      unit: 'pieces',
      weight_kg: 0,
      volume_m3: 0,
      unit_price: 0,
      total_price: 0,
      notes: ''
    }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof RequisitionItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setItems(updatedItems);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }
      setInvoiceFile(file);
      toast.success('Invoice file selected');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.facility_id) {
      toast.error('Please select a facility');
      return;
    }

    const validItems = items.filter(item => item.item_name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate items
    for (const item of validItems) {
      if (item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.item_name}`);
        return;
      }
    }

    try {
      // In a real implementation, you would upload the file first
      let invoiceUrl = '';
      if (invoiceFile) {
        // Upload file to Supabase storage
        // invoiceUrl = await uploadFile(invoiceFile);
        invoiceUrl = 'placeholder-url'; // Placeholder for now
      }

      const requisitionData = {
        ...formData,
        items: validItems,
        invoice_url: invoiceUrl
      };

      await onSubmit(requisitionData);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume_m3 * item.quantity), 0);
  const totalValue = items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Requisition Information</CardTitle>
          <CardDescription>Basic details about the requisition</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facility">Facility *</Label>
              <Select value={formData.facility_id} onValueChange={(value) => setFormData({...formData, facility_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map(facility => (
                    <SelectItem key={facility.id} value={facility.id}>
                      <div className="flex flex-col">
                        <span>{facility.name}</span>
                        <span className="text-sm text-muted-foreground">{facility.type} • {facility.zone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Requisition Type</Label>
              <Select value={formData.requisition_type} onValueChange={(value: 'routine' | 'emergency') => setFormData({...formData, requisition_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="emergency">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Emergency
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date">Expected Delivery Date</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">Invoice Upload (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="invoice-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('invoice-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {invoiceFile ? invoiceFile.name : 'Choose File'}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              placeholder="Additional notes or special instructions..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requisition Items</CardTitle>
              <CardDescription>Add items to this requisition</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name *</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Qty *</TableHead>
                  <TableHead>Pack Size</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Volume (m³)</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        placeholder="Item name"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Code"
                        value={item.item_code}
                        onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20"
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Pack size"
                        value={item.pack_size}
                        onChange={(e) => handleItemChange(index, 'pack_size', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={item.unit} onValueChange={(value) => handleItemChange(index, 'unit', value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.weight_kg}
                        onChange={(e) => handleItemChange(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.volume_m3}
                        onChange={(e) => handleItemChange(index, 'volume_m3', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ₦{item.total_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Notes"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Requisition Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Items:</span>
                <span className="ml-2 font-medium">{totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="ml-2 font-medium">{totalWeight.toFixed(2)} kg</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Volume:</span>
                <span className="ml-2 font-medium">{totalVolume.toFixed(3)} m³</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                <span className="ml-2 font-medium">₦{totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Requisition'}
        </Button>
      </div>
    </form>
  );
}

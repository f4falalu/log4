import { useState } from 'react';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ParsedRequisitionItem } from '@/lib/csvParser';
import { Badge } from '@/components/ui/badge';

interface ParsedItemsPreviewProps {
  items: ParsedRequisitionItem[];
  warnings: string[];
  onChange: (items: ParsedRequisitionItem[]) => void;
}

export function ParsedItemsPreview({ items, warnings, onChange }: ParsedItemsPreviewProps) {
  const handleItemChange = (index: number, field: keyof ParsedRequisitionItem, value: string | number | boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleAddItem = () => {
    const newItem: ParsedRequisitionItem = {
      item_name: '',
      quantity: 1,
      unit: 'units',
      temperature_required: false,
    };
    onChange([...items, newItem]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parsed Items ({items.length})</h3>
          <p className="text-sm text-muted-foreground">
            Review and edit the parsed requisition items
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500 mb-1">
                Warnings
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-600 space-y-1">
                {warnings.slice(0, 5).map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
                {warnings.length > 5 && (
                  <li className="text-xs italic">... and {warnings.length - 5} more warnings</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Item Name</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[100px]">Unit</TableHead>
              <TableHead className="w-[100px]">Weight (kg)</TableHead>
              <TableHead className="w-[100px]">Volume (m³)</TableHead>
              <TableHead className="w-[120px]">Temp Control</TableHead>
              <TableHead className="w-[200px]">Instructions</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No items to display
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      placeholder="Item name"
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
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="units"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.weight_kg || ''}
                      onChange={(e) => handleItemChange(index, 'weight_kg', parseFloat(e.target.value) || undefined)}
                      placeholder="0.0"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.volume_m3 || ''}
                      onChange={(e) => handleItemChange(index, 'volume_m3', parseFloat(e.target.value) || undefined)}
                      placeholder="0.0"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.temperature_required}
                        onChange={(e) => handleItemChange(index, 'temperature_required', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs">
                        {item.temperature_required ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={item.handling_instructions || ''}
                      onChange={(e) => handleItemChange(index, 'handling_instructions', e.target.value)}
                      placeholder="Instructions..."
                      className="h-8 min-h-8 resize-none text-xs"
                      rows={1}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-8 w-8 p-0"
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

      {items.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total items: {items.length}</span>
          <span>•</span>
          <span>
            Total quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </div>
      )}
    </div>
  );
}

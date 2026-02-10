import { useState } from 'react';
import { FileText, Loader2, CheckCircle2, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { useReadyRequisitions, useCreateInvoice } from '@/hooks/useInvoices';
import { useRequisition } from '@/hooks/useRequisitions';
import { useWarehouses } from '@/hooks/useWarehouses';
import type { InvoiceFormData } from '@/types/invoice';

interface ReadyRequestFormProps {
  onClose: () => void;
}

export function ReadyRequestForm({ onClose }: ReadyRequestFormProps) {
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');

  const { data: requisitions, isLoading: reqLoading } = useReadyRequisitions();
  const { data: selectedReq, isLoading: detailLoading } = useRequisition(selectedReqId || '');
  const { data: warehousesData } = useWarehouses();
  const createInvoice = useCreateInvoice();

  const warehouses = warehousesData?.warehouses || [];
  const reqItems = selectedReq?.items || [];

  const handleSubmit = async () => {
    if (!selectedReq || !warehouseId || reqItems.length === 0) return;

    const formData: InvoiceFormData = {
      requisition_id: selectedReq.id,
      warehouse_id: warehouseId,
      facility_id: selectedReq.facility_id,
      notes: `Created from requisition ${selectedReq.requisition_number}`,
      items: reqItems.map(item => ({
        description: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total_price: (item.unit_price || 0) * item.quantity,
        weight_kg: item.weight_kg,
        volume_m3: item.volume_m3,
      })),
    };

    try {
      await createInvoice.mutateAsync(formData);
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const canSubmit = !!selectedReqId && !!warehouseId && reqItems.length > 0;

  return (
    <div className="flex flex-col max-h-[70vh]">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {/* Requisition Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Select Approved Requisition
            </h3>

            {reqLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !requisitions || requisitions.length === 0 ? (
              <div className="h-48 border rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No approved requisitions available</p>
                  <p className="text-sm">Requisitions must be approved before they can be invoiced</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-auto border rounded-lg p-2">
                {requisitions.map((req: any) => (
                  <div
                    key={req.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedReqId === req.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => setSelectedReqId(req.id)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedReqId === req.id ? (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm font-mono">
                          {req.requisition_number || req.id.slice(0, 8)}
                        </p>
                        {req.facility && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.facility.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {req.priority && (
                        <Badge variant="outline" className="text-xs">
                          {req.priority}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Preview */}
          {selectedReqId && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Requisition Items
              </h3>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : reqItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items found in this requisition
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[80px]">Unit</TableHead>
                        <TableHead className="w-[100px] text-right">Unit Price</TableHead>
                        <TableHead className="w-[100px] text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reqItems.map((item: any, idx: number) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {(item.unit_price || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {((item.unit_price || 0) * item.quantity).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Warehouse Selection */}
          {selectedReqId && reqItems.length > 0 && (
            <div className="space-y-2">
              <Label>Source Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createInvoice.isPending}
        >
          {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
}

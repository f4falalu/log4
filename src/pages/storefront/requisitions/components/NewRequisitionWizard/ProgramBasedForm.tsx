import { useState } from 'react';
import { Check, Layers, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';

interface ProgramBasedFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Mock programs data - in real implementation, this would come from the database
const PROGRAMS = [
  { id: 'fp', name: 'Family Planning', itemCount: 24 },
  { id: 'hiv', name: 'HIV/AIDS', itemCount: 45 },
  { id: 'tb', name: 'Tuberculosis', itemCount: 18 },
  { id: 'malaria', name: 'Malaria', itemCount: 12 },
  { id: 'nutrition', name: 'Nutrition', itemCount: 30 },
  { id: 'immunization', name: 'Immunization', itemCount: 22 },
];

// Mock program items - in real implementation, this would be fetched based on selected programs
const PROGRAM_ITEMS = [
  { id: '1', name: 'Condoms (Male)', program: 'Family Planning', unit: 'pieces', defaultQty: 100 },
  { id: '2', name: 'Injectable Contraceptive', program: 'Family Planning', unit: 'vials', defaultQty: 50 },
  { id: '3', name: 'Oral Contraceptive Pills', program: 'Family Planning', unit: 'cycles', defaultQty: 100 },
  { id: '4', name: 'ARV First Line', program: 'HIV/AIDS', unit: 'bottles', defaultQty: 30 },
  { id: '5', name: 'ARV Second Line', program: 'HIV/AIDS', unit: 'bottles', defaultQty: 20 },
  { id: '6', name: 'HIV Test Kits', program: 'HIV/AIDS', unit: 'kits', defaultQty: 100 },
  { id: '7', name: 'TB Test Strips', program: 'Tuberculosis', unit: 'strips', defaultQty: 50 },
  { id: '8', name: 'Anti-TB Medication', program: 'Tuberculosis', unit: 'courses', defaultQty: 25 },
];

interface SelectedItem {
  id: string;
  name: string;
  program: string;
  unit: string;
  quantity: number;
}

export function ProgramBasedForm({ onClose, onSuccess }: ProgramBasedFormProps) {
  const [step, setStep] = useState<'programs' | 'items' | 'review'>('programs');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [requisitionDate] = useState(new Date().toISOString().split('T')[0]); // Auto-set to today
  const [requiredByDate, setRequiredByDate] = useState('');

  const { data: facilitiesData, isLoading: facilitiesLoading, error: facilitiesError } = useFacilities();
  const { data: warehousesData, isLoading: warehousesLoading, error: warehousesError } = useWarehouses();

  const facilities = facilitiesData?.facilities || [];
  const warehouses = warehousesData?.warehouses || [];

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev =>
      prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  const availableItems = PROGRAM_ITEMS.filter(item => {
    const program = PROGRAMS.find(p => p.name === item.program);
    const isInSelectedProgram = program && selectedPrograms.includes(program.id);
    const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase());
    return isInSelectedProgram && matchesSearch;
  });

  const toggleItem = (item: typeof PROGRAM_ITEMS[0]) => {
    const exists = selectedItems.find(i => i.id === item.id);
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, {
        id: item.id,
        name: item.name,
        program: item.program,
        unit: item.unit,
        quantity: item.defaultQty,
      }]);
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const handleConfirm = () => {
    // In real implementation, this would create the requisition
    onSuccess();
  };

  const canProceedToItems = selectedPrograms.length > 0;
  const canProceedToReview = selectedItems.length > 0 && facilityId && warehouseId;

  return (
    <>
      {step === 'programs' && (
        <>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Select one or more programs to load their associated items.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {PROGRAMS.map((program) => (
                  <div
                    key={program.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedPrograms.includes(program.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                      }
                    `}
                    onClick={() => toggleProgram(program.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedPrograms.includes(program.id)}
                          onCheckedChange={() => toggleProgram(program.id)}
                        />
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {program.itemCount} items available
                          </p>
                        </div>
                      </div>
                      {selectedPrograms.includes(program.id) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t bg-background flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => setStep('items')}
              disabled={!canProceedToItems}
            >
              Continue ({selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''})
            </Button>
          </div>
        </>
      )}

      {step === 'items' && (
        <>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {(facilitiesError || warehousesError) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {facilitiesError && <div>Failed to load facilities: {facilitiesError.message}</div>}
                  {warehousesError && <div>Failed to load warehouses: {warehousesError.message}</div>}
                </div>
              )}

              <div className="border rounded-md max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableItems.map((item) => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      const selectedItem = selectedItems.find(i => i.id === item.id);

                      return (
                        <TableRow
                          key={item.id}
                          className={isSelected ? 'bg-primary/5' : 'cursor-pointer hover:bg-muted/50'}
                          onClick={() => !isSelected && toggleItem(item)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItem(item)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.program}</Badge>
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            {isSelected ? (
                              <Input
                                type="number"
                                value={selectedItem?.quantity || item.defaultQty}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="h-8 w-20 text-right"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="text-muted-foreground">{item.defaultQty}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facility *</Label>
                    <Select value={facilityId} onValueChange={setFacilityId} disabled={facilitiesLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={facilitiesLoading ? "Loading facilities..." : "Select facility"} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {facilities.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No facilities available
                          </div>
                        ) : (
                          facilities.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse *</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId} disabled={warehousesLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select warehouse"} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {warehouses.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No warehouses available
                          </div>
                        ) : (
                          warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Requisition Date (auto)</Label>
                    <Input
                      type="date"
                      value={requisitionDate}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Required By Date (optional)</Label>
                    <Input
                      type="date"
                      value={requiredByDate}
                      onChange={(e) => setRequiredByDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delivery scheduling happens in /scheduler
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t bg-background flex justify-between">
            <Button variant="outline" onClick={() => setStep('programs')}>
              Back to Programs
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canProceedToReview}
              >
                Create Requisition ({selectedItems.length} items)
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

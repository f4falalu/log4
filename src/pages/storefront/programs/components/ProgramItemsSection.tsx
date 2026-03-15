import { useState } from 'react';
import { Plus, X, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useItems, useUpdateItem } from '@/hooks/useItems';
import { toast } from 'sonner';
import type { Program } from '@/types/program';
import type { Item } from '@/types/items';

interface ProgramItemsSectionProps {
  program: Program;
}

export function ProgramItemsSection({ program }: ProgramItemsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch items linked to this program
  const { data, isLoading } = useItems({ program: program.code });
  const items = data?.items || [];

  const updateItem = useUpdateItem();

  const handleRemove = (item: Item) => {
    updateItem.mutate(
      { id: item.id, data: { program: undefined } },
      {
        onSuccess: () => toast.success(`Removed ${item.item_name || item.description} from ${program.name}`),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Items</h4>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Items
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">No items linked to this program</p>
        </div>
      ) : (
        <div className="border rounded-lg max-h-[300px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">
                    {item.item_name || item.description}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {item.product_code || item.serial_number}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{item.category || '—'}</TableCell>
                  <TableCell className="text-sm">{item.stock_on_hand ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(item)}
                      disabled={updateItem.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddItemsToProgramDialog
        program={program}
        existingItemIds={items.map((i) => i.id)}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
    </div>
  );
}

// ─── Add Items Dialog ───────────────────────────────────────────────

interface AddItemsToProgramDialogProps {
  program: Program;
  existingItemIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddItemsToProgramDialog({
  program,
  existingItemIds,
  open,
  onOpenChange,
}: AddItemsToProgramDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useItems(
    search ? { search } : undefined,
    0,
    50
  );

  const updateItem = useUpdateItem();

  const availableItems = (data?.items || []).filter(
    (item) => !existingItemIds.includes(item.id)
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    try {
      await Promise.all(
        ids.map((id) =>
          updateItem.mutateAsync({
            id,
            data: { program: program.code },
          })
        )
      );
      toast.success(`Added ${ids.length} item(s) to ${program.name}`);
      setSelected(new Set());
      onOpenChange(false);
    } catch {
      toast.error('Failed to add some items');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Items to {program.name}</DialogTitle>
          <DialogDescription>
            Search and select items to link to this program.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-lg min-h-[200px] max-h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : availableItems.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-muted-foreground">
                {search ? 'No matching items found' : 'All items are already linked'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>Item Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => toggleSelect(item.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {item.item_name || item.description}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {item.product_code || item.serial_number}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">{item.category || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={selected.size === 0 || updateItem.isPending}>
              Add to Program
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

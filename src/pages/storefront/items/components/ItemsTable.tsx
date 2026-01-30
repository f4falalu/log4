import { format } from 'date-fns';
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Item } from '@/types/items';
import { useDeleteItem } from '@/hooks/useItems';
import { ItemCategoryBadge } from './ItemCategoryBadge';

interface ItemsTableProps {
  items: Item[];
  isLoading: boolean;
  onItemClick: (item: Item) => void;
  onEdit: (item: Item) => void;
  selectedItemId?: string;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function ItemsTable({
  items,
  isLoading,
  onItemClick,
  onEdit,
  selectedItemId,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: ItemsTableProps) {
  const deleteItem = useDeleteItem();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  const handleDelete = (item: Item) => {
    if (confirm(`Are you sure you want to delete "${item.description}"?`)) {
      deleteItem.mutate(item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No items found</p>
        <p className="text-sm">Try adjusting your filters or add a new item</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">S/N</TableHead>
              <TableHead className="min-w-[200px]">Item Description</TableHead>
              <TableHead>Unit Pack</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Weight (kg)</TableHead>
              <TableHead className="text-right">Volume (m³)</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>Mfg. Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Lot No.</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50',
                  selectedItemId === item.id && 'bg-blue-50'
                )}
                onClick={() => onItemClick(item)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {page * 50 + index + 1}
                </TableCell>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{item.unit_pack || '-'}</TableCell>
                <TableCell>
                  <ItemCategoryBadge category={item.category} />
                </TableCell>
                <TableCell className="text-right font-mono">
                  {item.weight_kg?.toFixed(2) || '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {item.volume_m3?.toFixed(4) || '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.batch_number || '-'}</TableCell>
                <TableCell>{formatDate(item.mfg_date)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      isExpired(item.expiry_date) && 'text-red-600 font-semibold',
                      isExpiringSoon(item.expiry_date) && !isExpired(item.expiry_date) && 'text-orange-600'
                    )}
                  >
                    {formatDate(item.expiry_date)}
                  </span>
                  {isExpired(item.expiry_date) && (
                    <Badge variant="destructive" className="ml-1 text-xs">Expired</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.lot_number || '-'}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      'font-semibold',
                      item.stock_on_hand <= 10 && 'text-orange-600',
                      item.stock_on_hand === 0 && 'text-red-600'
                    )}
                  >
                    {item.stock_on_hand}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(item.total_price)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 border-t p-4 flex items-center justify-between bg-background">
        <p className="text-sm text-muted-foreground">
          Showing {page * 50 + 1} to {Math.min((page + 1) * 50, totalItems)} of {totalItems} items
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

import { format } from 'date-fns';
import { MoreHorizontal, Edit, Trash, Eye, Package, AlertTriangle, ChevronRight } from 'lucide-react';
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

interface ItemsListViewProps {
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

export function ItemsListView({
  items,
  isLoading,
  onItemClick,
  onEdit,
  selectedItemId,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: ItemsListViewProps) {
  const deleteItem = useDeleteItem();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return null;
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
      <div className="p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>No items found</p>
        <p className="text-sm">Try adjusting your filters or add a new item</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                selectedItemId === item.id && 'bg-blue-50'
              )}
              onClick={() => onItemClick(item)}
            >
              {/* Left: Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ItemCategoryBadge category={item.category} />
                  {item.batch_number && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.batch_number}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold truncate">{item.description}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Pack: {item.unit_pack || '-'}</span>
                  {item.expiry_date && (
                    <span className={cn(
                      isExpired(item.expiry_date) && 'text-red-600',
                      isExpiringSoon(item.expiry_date) && !isExpired(item.expiry_date) && 'text-orange-600'
                    )}>
                      Exp: {formatDate(item.expiry_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Center: Stock & alerts */}
              <div className="flex items-center gap-6">
                {(isExpired(item.expiry_date) || isExpiringSoon(item.expiry_date)) && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className={cn(
                      'h-4 w-4',
                      isExpired(item.expiry_date) ? 'text-red-500' : 'text-orange-500'
                    )} />
                    <Badge variant={isExpired(item.expiry_date) ? 'destructive' : 'secondary'}>
                      {isExpired(item.expiry_date) ? 'Expired' : 'Expiring'}
                    </Badge>
                  </div>
                )}

                <div className="text-right min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p className={cn(
                    'font-semibold',
                    item.stock_on_hand <= 10 && 'text-orange-600',
                    item.stock_on_hand === 0 && 'text-red-600'
                  )}>
                    {item.stock_on_hand}
                  </p>
                </div>

                <div className="text-right min-w-[100px]">
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="font-mono">{formatCurrency(item.unit_price)}</p>
                </div>

                <div className="text-right min-w-[120px]">
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
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
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
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

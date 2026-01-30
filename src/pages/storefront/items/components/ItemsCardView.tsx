import { format } from 'date-fns';
import { MoreHorizontal, Edit, Trash, Eye, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface ItemsCardViewProps {
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

export function ItemsCardView({
  items,
  isLoading,
  onItemClick,
  onEdit,
  selectedItemId,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: ItemsCardViewProps) {
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
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
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
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-shadow',
                selectedItemId === item.id && 'ring-2 ring-primary'
              )}
              onClick={() => onItemClick(item)}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex-1 min-w-0 pr-2">
                  <ItemCategoryBadge category={item.category} />
                  <h3 className="font-semibold mt-2 line-clamp-2">{item.description}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unit Pack</span>
                  <span className="font-medium">{item.unit_pack || '-'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stock</span>
                  <span className={cn(
                    'font-semibold',
                    item.stock_on_hand <= 10 && 'text-orange-600',
                    item.stock_on_hand === 0 && 'text-red-600'
                  )}>
                    {item.stock_on_hand}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="font-mono">{formatCurrency(item.unit_price)}</span>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <span className="font-semibold">{formatCurrency(item.total_price)}</span>
                </div>

                {(isExpired(item.expiry_date) || isExpiringSoon(item.expiry_date)) && (
                  <div className="flex items-center gap-2 pt-2">
                    <AlertTriangle className={cn(
                      'h-4 w-4',
                      isExpired(item.expiry_date) ? 'text-red-500' : 'text-orange-500'
                    )} />
                    <span className={cn(
                      'text-xs',
                      isExpired(item.expiry_date) ? 'text-red-600' : 'text-orange-600'
                    )}>
                      {isExpired(item.expiry_date)
                        ? 'Expired'
                        : `Expires ${formatDate(item.expiry_date)}`
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
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

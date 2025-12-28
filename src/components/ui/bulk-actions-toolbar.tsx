/**
 * BulkActionsToolbar Component
 * Standardized toolbar for bulk operations on selected items
 * Appears when items are selected in tables or grids
 */

import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: React.ReactNode;
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground px-4 py-3 rounded-lg flex items-center justify-between gap-4 mb-4 shadow-md',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium text-sm">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

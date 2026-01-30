/**
 * =====================================================
 * Working Set Column (Middle Column)
 * =====================================================
 * Displays selected facilities in the batch-in-formation.
 * Supports reordering via drag-and-drop or buttons.
 */

import * as React from 'react';
import {
  GripVertical,
  X,
  ChevronUp,
  ChevronDown,
  Building2,
  Package,
  MapPin,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkingSetItem } from '@/types/unified-workflow';

interface WorkingSetColumnProps {
  items: WorkingSetItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (facilityId: string) => void;
  onClear: () => void;
  className?: string;
}

export function WorkingSetColumn({
  items,
  onReorder,
  onRemove,
  onClear,
  className,
}: WorkingSetColumnProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Button reorder handlers
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < items.length - 1) {
      onReorder(index, index + 1);
    }
  };

  // Calculate totals
  const totals = React.useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        slots: acc.slots + (item.slot_demand || 0),
        weight: acc.weight + (item.weight_kg || 0),
        volume: acc.volume + (item.volume_m3 || 0),
      }),
      { slots: 0, weight: 0, volume: 0 }
    );
  }, [items]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Clear Button */}
      {items.length > 0 && (
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'facility' : 'facilities'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No facilities selected</p>
              <p className="text-xs mt-1">
                Add facilities from the left column to build your schedule
              </p>
            </div>
          ) : (
            items.map((item, index) => (
              <WorkingSetCard
                key={item.facility_id}
                item={item}
                index={index}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onRemove={() => onRemove(item.facility_id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Totals */}
      {items.length > 0 && (
        <div className="p-3 border-t bg-muted/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Stops</p>
              <p className="text-sm font-semibold">{items.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Slots</p>
              <p className="text-sm font-semibold">{totals.slots}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weight</p>
              <p className="text-sm font-semibold">
                {totals.weight > 0 ? `${totals.weight.toLocaleString()} kg` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Working Set Card Sub-component
// =====================================================

interface WorkingSetCardProps {
  item: WorkingSetItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function WorkingSetCard({
  item,
  index,
  isFirst,
  isLast,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onRemove,
}: WorkingSetCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-lg border bg-card',
        'transition-all duration-150',
        isDragging && 'opacity-50 scale-95',
        isDragOver && 'border-primary border-dashed bg-primary/5'
      )}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Sequence Number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.facility_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.lga && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {item.lga}
            </span>
          )}
          {item.slot_demand > 0 && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
              {item.slot_demand} slots
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isFirst}
          onClick={onMoveUp}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isLast}
          onClick={onMoveDown}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default WorkingSetColumn;

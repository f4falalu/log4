import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RequisitionsListProps {
  requisitions: any[];
  assignments: any[];
  selectedRequisitions: Set<string>;
  onToggleSelection: (id: string) => void;
}

export function RequisitionsList({
  requisitions,
  assignments,
  selectedRequisitions,
  onToggleSelection
}: RequisitionsListProps) {
  // Filter out already assigned requisitions
  const assignedIds = new Set(assignments.map(a => a.requisition_id));
  const availableRequisitions = requisitions.filter(r => !assignedIds.has(r.id));

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Available Requisitions</h3>
        <Badge variant="outline">
          {availableRequisitions.length} pending
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {availableRequisitions.map((req) => (
            <DraggableRequisition
              key={req.id}
              requisition={req}
              selected={selectedRequisitions.has(req.id)}
              onToggle={() => onToggleSelection(req.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

function DraggableRequisition({ requisition, selected, onToggle }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: requisition.id,
  });

  const totalWeight = requisition.requisition_items?.reduce(
    (sum: number, item: any) => sum + (item.weight_kg * item.quantity),
    0
  ) || 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 p-3 border rounded-lg cursor-move hover:bg-muted/50 transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${selected ? 'border-primary bg-primary/5' : ''}`}
    >
      <div {...listeners} {...attributes}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-sm truncate">
            {requisition.requisition_number}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {requisition.facilities?.name || 'Unknown facility'}
        </p>
      </div>
      
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium">{totalWeight.toFixed(0)} kg</p>
        <p className="text-xs text-muted-foreground">
          {requisition.requisition_items?.length || 0} items
        </p>
      </div>
      
      <Badge variant={requisition.priority === 'high' ? 'destructive' : 'secondary'}>
        {requisition.priority}
      </Badge>
    </div>
  );
}

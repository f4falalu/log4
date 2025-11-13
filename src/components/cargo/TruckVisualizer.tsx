import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VehicleTier } from '@/hooks/useVehicleTiers';
import { Package } from 'lucide-react';

interface TruckVisualizerProps {
  tiers: VehicleTier[];
  assignments: any[];
  vehicleId: string;
  batchId: string;
}

const tierColors = ['#4CAF50', '#FFC107', '#2196F3'];

export function TruckVisualizer({ tiers, assignments, vehicleId, batchId }: TruckVisualizerProps) {
  return (
    <Card className="p-6 h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Vehicle Load Bay</h3>
          <Badge variant="outline">
            {assignments.length} items assigned
          </Badge>
        </div>

        <div className="space-y-2">
          {tiers.map((tier, idx) => (
            <TierZone
              key={tier.id}
              tier={tier}
              assignments={assignments.filter(a => a.vehicle_tier_id === tier.id)}
              color={tierColors[idx % tierColors.length]}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function TierZone({ tier, assignments, color }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: tier.id,
  });

  const assignedWeight = assignments.reduce((sum: number, a: any) => 
    sum + a.assigned_weight_kg, 0
  );
  const utilization = (assignedWeight / tier.max_weight_kg) * 100;

  return (
    <div
      ref={setNodeRef}
      className={`relative border-2 rounded-lg p-4 transition-all ${
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      style={{ minHeight: '120px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-sm">{tier.tier_name}</span>
        </div>
        <Badge variant={utilization > 90 ? 'destructive' : 'secondary'}>
          {utilization.toFixed(0)}%
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        {assignedWeight.toFixed(0)} / {tier.max_weight_kg} kg
      </div>

      {/* Assigned Items */}
      <div className="flex flex-wrap gap-2">
        {assignments.map((assignment: any) => (
          <div
            key={assignment.id}
            className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded text-xs"
          >
            <Package className="w-3 h-3" />
            <span>{assignment.requisitions?.requisition_number}</span>
          </div>
        ))}
      </div>

      {isOver && (
        <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium">Drop here to assign</span>
        </div>
      )}
    </div>
  );
}

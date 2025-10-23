import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface PayloadItem {
  id: string;
  name: string;
  weight_kg: number;
  volume_m3: number;
  quantity: number;
}

interface PayloadVisualizerProps {
  items: PayloadItem[];
  vehicleCapacityWeight?: number;
  vehicleCapacityVolume?: number;
  showVisual?: boolean;
}

export function PayloadVisualizer({ 
  items, 
  vehicleCapacityWeight = 1000, 
  vehicleCapacityVolume = 10,
  showVisual = true 
}: PayloadVisualizerProps) {
  const stats = useMemo(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0);
    const totalVolume = items.reduce((sum, item) => sum + item.volume_m3 * item.quantity, 0);
    const weightUtilization = (totalWeight / vehicleCapacityWeight) * 100;
    const volumeUtilization = (totalVolume / vehicleCapacityVolume) * 100;
    const utilizationPct = Math.max(weightUtilization, volumeUtilization);
    
    return {
      totalWeight,
      totalVolume,
      weightUtilization,
      volumeUtilization,
      utilizationPct: Math.min(utilizationPct, 100),
      isOverweight: totalWeight > vehicleCapacityWeight,
      isOvervolume: totalVolume > vehicleCapacityVolume,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [items, vehicleCapacityWeight, vehicleCapacityVolume]);

  const getStatusColor = () => {
    if (stats.utilizationPct > 90) return 'text-biko-danger';
    if (stats.utilizationPct > 70) return 'text-biko-warning';
    return 'text-biko-success';
  };

  const getStatusIcon = () => {
    if (stats.utilizationPct > 90) return AlertTriangle;
    if (stats.utilizationPct > 70) return TrendingUp;
    return CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <Card className="border-biko-border/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-biko-foreground">
          <Package className="w-5 h-5 text-biko-primary" />
          Payload Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-biko-muted">Total Weight</p>
            <p className="text-2xl font-bold text-biko-foreground">
              {stats.totalWeight.toFixed(0)}
              <span className="text-sm font-normal text-biko-muted ml-1">kg</span>
            </p>
            <p className="text-xs text-biko-muted">of {vehicleCapacityWeight}kg capacity</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-biko-muted">Total Volume</p>
            <p className="text-2xl font-bold text-biko-foreground">
              {stats.totalVolume.toFixed(2)}
              <span className="text-sm font-normal text-biko-muted ml-1">m³</span>
            </p>
            <p className="text-xs text-biko-muted">of {vehicleCapacityVolume}m³ capacity</p>
          </div>
        </div>

        {/* Utilization Bars */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-biko-muted">Weight Utilization</span>
              <span className={`font-medium ${stats.isOverweight ? 'text-biko-danger' : 'text-biko-foreground'}`}>
                {stats.weightUtilization.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(stats.weightUtilization, 100)} 
              className={`h-2 ${stats.isOverweight ? '[&>div]:bg-red-500' : '[&>div]:bg-biko-primary'}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-biko-muted">Volume Utilization</span>
              <span className={`font-medium ${stats.isOvervolume ? 'text-biko-danger' : 'text-biko-foreground'}`}>
                {stats.volumeUtilization.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(stats.volumeUtilization, 100)} 
              className={`h-2 ${stats.isOvervolume ? '[&>div]:bg-red-500' : '[&>div]:bg-biko-primary'}`}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-biko-surface/50 border border-biko-border/20">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${getStatusColor()}`} />
            <div>
              <p className="font-medium text-biko-foreground">
                {stats.utilizationPct > 90 ? 'Overloaded' : stats.utilizationPct > 70 ? 'Near Capacity' : 'Optimal Load'}
              </p>
              <p className="text-sm text-biko-muted">
                {stats.itemCount} items across {items.length} entries
              </p>
            </div>
          </div>
          <Badge 
            variant={stats.utilizationPct > 90 ? 'destructive' : 'secondary'}
            className="text-lg px-4 py-2"
          >
            {stats.utilizationPct.toFixed(0)}%
          </Badge>
        </div>

        {/* Warnings */}
        {(stats.isOverweight || stats.isOvervolume) && (
          <div className="p-4 rounded-lg bg-biko-danger/10 border border-biko-danger/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-biko-danger mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-biko-danger">Vehicle Overload Warning</p>
                <p className="text-sm text-biko-muted">
                  {stats.isOverweight && 'Weight exceeds vehicle capacity. '}
                  {stats.isOvervolume && 'Volume exceeds vehicle capacity. '}
                  Consider redistributing items or selecting a larger vehicle.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visual Representation */}
        {showVisual && items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-biko-foreground">Cargo Distribution</p>
            <div className="relative w-full h-32 border-2 border-biko-border/20 rounded-lg overflow-hidden bg-biko-surface/30">
              {items.map((item, index) => {
                const itemPercentage = ((item.volume_m3 * item.quantity) / stats.totalVolume) * 100;
                return (
                  <div
                    key={item.id}
                    className="absolute bottom-0 left-0 transition-all duration-300 hover:brightness-110"
                    style={{
                      width: `${itemPercentage}%`,
                      height: `${Math.min((itemPercentage / stats.volumeUtilization) * 100, 100)}%`,
                      left: `${items.slice(0, index).reduce((sum, i) => sum + ((i.volume_m3 * i.quantity) / stats.totalVolume) * 100, 0)}%`,
                      backgroundColor: `hsl(${(index * 360) / items.length}, 70%, 60%)`
                    }}
                    title={`${item.name}: ${item.volume_m3}m³`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-biko-muted text-center">
              Visual representation of payload volume distribution
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DeliveryBatch } from '@/types';

interface KPIMetricsProps {
  batches: DeliveryBatch[];
}

interface KPICard {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}

const KPIMetrics = ({ batches }: KPIMetricsProps) => {
  const kpis = useMemo((): KPICard[] => {
    const activeRoutes = batches.filter(b => b.status === 'in-progress').length;
    const totalRoutes = batches.length;
    const completedRoutes = batches.filter(b => b.status === 'completed').length;
    const assignedRoutes = batches.filter(b => b.status === 'assigned' || b.status === 'in-progress').length;
    
    // Calculate fleet utilization (assuming 4 vehicles total)
    const totalVehicles = 4;
    const inUseVehicles = batches.filter(b => b.status === 'in-progress' && b.vehicleId).length;
    const fleetUtilization = totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0;
    
    // Calculate on-time performance (simplified: completed vs delayed)
    const onTimePerformance = totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 100;
    
    // Calculate completion rate
    const completionRate = totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0;

    return [
      {
        label: 'Active Routes',
        value: activeRoutes,
        trend: activeRoutes > 2 ? 'up' : 'neutral',
        trendValue: `${assignedRoutes} assigned`,
        status: activeRoutes > 3 ? 'warning' : 'success'
      },
      {
        label: 'Fleet Utilization',
        value: `${fleetUtilization}%`,
        trend: fleetUtilization > 75 ? 'up' : fleetUtilization > 50 ? 'neutral' : 'down',
        trendValue: `${inUseVehicles}/${totalVehicles} vehicles`,
        status: fleetUtilization > 80 ? 'success' : fleetUtilization > 50 ? 'warning' : 'danger'
      },
      {
        label: 'On-Time Performance',
        value: `${onTimePerformance}%`,
        trend: onTimePerformance >= 90 ? 'up' : onTimePerformance >= 70 ? 'neutral' : 'down',
        trendValue: `${completedRoutes} completed`,
        status: onTimePerformance >= 90 ? 'success' : onTimePerformance >= 70 ? 'warning' : 'danger'
      },
      {
        label: "Today's Completion",
        value: `${completionRate}%`,
        trend: completionRate > 50 ? 'up' : 'neutral',
        trendValue: `${completedRoutes}/${totalRoutes} routes`,
        status: completionRate > 75 ? 'success' : completionRate > 50 ? 'warning' : 'neutral'
      }
    ];
  }, [batches]);

  const getStatusColor = (status: KPICard['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'danger': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: KPICard['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground mb-1">{kpi.label}</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-bold ${getStatusColor(kpi.status)}`}>
                {kpi.value}
              </span>
              <div className={`flex items-center gap-1 text-sm ${getStatusColor(kpi.status)}`}>
                {getTrendIcon(kpi.trend)}
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-2">{kpi.trendValue}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default KPIMetrics;

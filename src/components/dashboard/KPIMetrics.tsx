/**
 * Phase 2: Analytics Backend - KPIMetrics Component
 *
 * CRITICAL: This component contains ZERO client-side aggregation logic.
 * All calculations are performed server-side via analytics hooks (Ticket A7).
 * This component ONLY displays pre-computed data from the database.
 *
 * DO NOT add .filter(), .reduce(), .length, or any aggregation logic here.
 * Use hooks from @/hooks/useAnalytics instead.
 *
 * Last Updated: 2025-12-29 (Phase 0 Block 3 - Architecture Correction)
 */

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useAnalytics';

interface KPIMetricsProps {
  startDate?: string | null;
  endDate?: string | null;
}

interface KPICard {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}

const KPIMetrics = ({ startDate, endDate }: KPIMetricsProps) => {
  // ✅ CORRECT: All data from server-side hook (no client-side aggregation)
  const { data: summary, isLoading, error } = useDashboardSummary(startDate, endDate);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 col-span-full">
          <div className="text-destructive text-sm">
            Error loading KPI metrics: {error.message}
          </div>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // ✅ CORRECT: All values come from server-side pre-computed summary
  const kpis: KPICard[] = [
    {
      label: 'Active Deliveries',
      value: summary.total_deliveries || 0,
      trend: (summary.total_deliveries || 0) > 2 ? 'up' : 'neutral',
      trendValue: `${Math.round(summary.on_time_rate || 0)}% on-time`,
      status: (summary.total_deliveries || 0) > 3 ? 'warning' : 'success'
    },
    {
      label: 'Fleet Utilization',
      value: `${Math.round(summary.vehicle_utilization_rate || 0)}%`,
      trend: (summary.vehicle_utilization_rate || 0) > 75 ? 'up' : (summary.vehicle_utilization_rate || 0) > 50 ? 'neutral' : 'down',
      trendValue: `${summary.active_vehicles || 0} active vehicles`,
      status: (summary.vehicle_utilization_rate || 0) > 80 ? 'success' : (summary.vehicle_utilization_rate || 0) > 50 ? 'warning' : 'danger'
    },
    {
      label: 'On-Time Performance',
      value: `${Math.round(summary.on_time_rate || 0)}%`,
      trend: (summary.on_time_rate || 0) >= 90 ? 'up' : (summary.on_time_rate || 0) >= 70 ? 'neutral' : 'down',
      trendValue: `${summary.total_deliveries || 0} deliveries`,
      status: (summary.on_time_rate || 0) >= 90 ? 'success' : (summary.on_time_rate || 0) >= 70 ? 'warning' : 'danger'
    },
    {
      label: "Today's Completion",
      value: `${Math.round(summary.avg_completion_hours || 0)}h`,
      trend: (summary.avg_completion_hours || 0) < 4 ? 'up' : 'neutral',
      trendValue: `${summary.total_items || 0} items`,
      status: (summary.avg_completion_hours || 0) < 4 ? 'success' : (summary.avg_completion_hours || 0) < 8 ? 'warning' : 'neutral'
    }
  ];

  const getStatusColor = (status: KPICard['status']) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-destructive';
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

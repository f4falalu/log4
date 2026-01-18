/**
 * AnalyticsDialog
 *
 * Dialog for viewing planning analytics and insights.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3, Activity, Clock, Target } from 'lucide-react';

interface AnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

function MetricCard({ label, value, change, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold">{value}</span>
        {change && (
          <span
            className={`text-sm flex items-center gap-1 ${
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export function AnalyticsDialog({ open, onOpenChange }: AnalyticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Planning Analytics</DialogTitle>
          <DialogDescription>
            Overview of planning metrics and performance indicators.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <MetricCard
            label="Total Demand"
            value="2,450"
            change="+12%"
            trend="up"
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            label="Capacity Utilization"
            value="78%"
            change="+5%"
            trend="up"
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            label="Avg. Delivery Time"
            value="42 min"
            change="-8%"
            trend="up"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            label="SLA Compliance"
            value="94%"
            change="+2%"
            trend="up"
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <h4 className="text-sm font-medium mb-3">Regional Insights</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">High demand areas</span>
              <span className="font-medium">Lagos, Abuja, Kano</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Coverage gaps</span>
              <span className="font-medium text-amber-500">3 zones identified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Optimization potential</span>
              <span className="font-medium text-green-500">+15% efficiency</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Activity, Archive, BarChart3, TrendingUp } from 'lucide-react';

export type PlanningMetric = 'demand' | 'capacity' | 'sla';

interface MetricsTogglePanelProps {
    selectedMetric: PlanningMetric;
    onMetricChange: (metric: PlanningMetric) => void;
}

export function MetricsTogglePanel({ selectedMetric, onMetricChange }: MetricsTogglePanelProps) {
    return (
        <Card className="p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-muted shadow-lg w-64">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                Analysis Metric
            </div>
            <div className="flex flex-col gap-1">
                <Button
                    variant={selectedMetric === 'demand' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => onMetricChange('demand')}
                >
                    <TrendingUp className="mr-2 h-4 w-4 text-orange-500" />
                    Forecasted Demand
                </Button>
                <Button
                    variant={selectedMetric === 'capacity' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => onMetricChange('capacity')}
                >
                    <Archive className="mr-2 h-4 w-4 text-blue-500" />
                    Capacity Utilization
                </Button>
                <Button
                    variant={selectedMetric === 'sla' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => onMetricChange('sla')}
                >
                    <Activity className="mr-2 h-4 w-4 text-green-500" />
                    SLA Risk
                </Button>
            </div>
        </Card>
    );
}

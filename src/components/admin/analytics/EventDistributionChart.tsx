import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useEventDistribution } from '@/hooks/admin/useAnalytics';
import { chartColors } from '@/lib/colors';

const COLORS = chartColors;

interface EventDistributionChartProps {
  days?: number;
}

export function EventDistributionChart({ days = 7 }: EventDistributionChartProps) {
  const { data, isLoading } = useEventDistribution(days);

  // Take top 10 events
  const chartData = (data || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      event_type: item.event_type.replace(/_/g, ' '),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Distribution</CardTitle>
        <CardDescription>Top event types in the last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis
                type="category"
                dataKey="event_type"
                className="text-xs"
                width={140}
                tickFormatter={(value) =>
                  value.length > 18 ? value.slice(0, 18) + '...' : value
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

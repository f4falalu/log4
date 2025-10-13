import { useState } from 'react';
import { DriverStatistics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DriverStatisticsChartsProps {
  statistics: DriverStatistics;
}

type TimeRange = 'W' | 'M' | '6M' | 'Y';

export function DriverStatisticsCharts({ statistics }: DriverStatisticsChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('W');

  // Category time data for stacked bar
  const categoryData = [
    {
      name: 'Time Distribution',
      'On the Way': statistics.timeCategories.onTheWay,
      'Unloading': statistics.timeCategories.unloading,
      'Loading': statistics.timeCategories.loading,
      'Waiting': statistics.timeCategories.waiting,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Average Time by Category */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
              Average Time Per Day By Category
            </CardTitle>
            <div className="flex gap-1">
              {(['W', 'M', '6M', 'Y'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="h-7 px-3 text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="On the Way" stackId="a" fill="#3b82f6" radius={[4, 0, 0, 4]} />
              <Bar dataKey="Unloading" stackId="a" fill="#10b981" />
              <Bar dataKey="Loading" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Waiting" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#3b82f6]" />
              <div className="text-xs">
                <div className="text-muted-foreground">On the Way</div>
                <div className="font-semibold">{statistics.timeCategories.onTheWay}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#10b981]" />
              <div className="text-xs">
                <div className="text-muted-foreground">Unloading</div>
                <div className="font-semibold">{statistics.timeCategories.unloading}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#f59e0b]" />
              <div className="text-xs">
                <div className="text-muted-foreground">Loading</div>
                <div className="font-semibold">{statistics.timeCategories.loading}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#6b7280]" />
              <div className="text-xs">
                <div className="text-muted-foreground">Waiting</div>
                <div className="font-semibold">{statistics.timeCategories.waiting}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Time Per Day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
            Working Time Per Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statistics.workingTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12 }}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => `${value} hrs`}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="workingTime" fill="#3b82f6" name="Working Time" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="averageTime"
                fill="#94a3b8"
                name="Average Working Time"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

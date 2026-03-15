import { useState } from 'react';
import { DriverStatistics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Package, MapPin, Star } from 'lucide-react';

interface DriverStatisticsChartsProps {
  statistics: DriverStatistics;
}

type TimeRange = 'W' | 'M' | '6M' | 'Y';

const timeDistributionConfig: ChartConfig = {
  onTheWay: { label: 'On the Way', color: 'hsl(217, 91%, 60%)' },
  unloading: { label: 'Unloading', color: 'hsl(160, 84%, 39%)' },
  loading: { label: 'Loading', color: 'hsl(38, 92%, 50%)' },
  waiting: { label: 'Waiting', color: 'hsl(220, 9%, 46%)' },
};

const workingTimeConfig: ChartConfig = {
  workingTime: { label: 'Working Time', color: 'hsl(217, 91%, 60%)' },
  averageTime: { label: 'Average', color: 'hsl(215, 16%, 65%)' },
};

export function DriverStatisticsCharts({ statistics }: DriverStatisticsChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('W');

  const categoryData = [
    {
      name: 'Time Distribution',
      onTheWay: statistics.timeCategories.onTheWay,
      unloading: statistics.timeCategories.unloading,
      loading: statistics.timeCategories.loading,
      waiting: statistics.timeCategories.waiting,
    },
  ];

  const kpis = [
    {
      label: 'Total Deliveries',
      value: statistics.totalDeliveries,
      icon: Package,
    },
    {
      label: 'Total Distance',
      value: `${statistics.totalDistance.toLocaleString()} km`,
      icon: MapPin,
    },
    {
      label: 'Avg Rating',
      value: statistics.averageRating.toFixed(1),
      icon: Star,
    },
    {
      label: 'On-Time',
      value: '96%',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <kpi.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <ChartContainer config={timeDistributionConfig} className="h-[80px] w-full">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}%`} />}
              />
              <Bar dataKey="onTheWay" stackId="a" fill="var(--color-onTheWay)" radius={[4, 0, 0, 4]} />
              <Bar dataKey="unloading" stackId="a" fill="var(--color-unloading)" />
              <Bar dataKey="loading" stackId="a" fill="var(--color-loading)" />
              <Bar dataKey="waiting" stackId="a" fill="var(--color-waiting)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {Object.entries(timeDistributionConfig).map(([key, config]) => {
              const value = statistics.timeCategories[key as keyof typeof statistics.timeCategories];
              return (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="text-xs">
                    <div className="text-muted-foreground">{String(config.label)}</div>
                    <div className="font-semibold">{value}%</div>
                  </div>
                </div>
              );
            })}
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
          <ChartContainer config={workingTimeConfig} className="h-[220px] w-full">
            <BarChart data={statistics.workingTimeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => `${value} hrs`} />}
              />
              <Bar dataKey="workingTime" fill="var(--color-workingTime)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="averageTime" fill="var(--color-averageTime)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-6 mt-3">
            {Object.entries(workingTimeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: config.color }} />
                <span className="text-muted-foreground">{String(config.label)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

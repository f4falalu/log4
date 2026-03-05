// MOD4 Shift Summary Page
// Daily stats, performance metrics, and delivery analytics

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useBatchStore } from '@/stores/batchStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  Clock,
  TrendingUp,
  Award,
  MapPin,
  Timer,
  Target,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

export default function ShiftSummary() {
  const { driver } = useAuthStore();
  const { completedSlots, totalSlots, progress } = useBatchStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // TODO: Calculate real metrics from delivery history
  const hourlyData: Array<{ hour: string; deliveries: number; target: number }> = [];
  const weeklyData: Array<{ day: string; deliveries: number; skipped: number }> = [];
  const statusBreakdown: Array<{ name: string; value: number; color: string }> = [];

  const metrics = {
    deliveries: completedSlots,
    target: totalSlots,
    onTime: 0,
    avgTime: '0',
    distance: 0,
    efficiency: 0,
    streak: 0,
    rank: 0,
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : subDays(prev, -1)
    );
  };

  return (
    <AppShell title="Shift Summary" showNav={true}>
      <div className="p-4 space-y-6 pb-24">
        {/* Date selector */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{format(selectedDate, 'EEEE, MMM d')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate('next')}
            disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Deliveries Today</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{metrics.deliveries}</span>
                    <span className="text-lg text-muted-foreground">/ {metrics.target}</span>
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="w-8 h-8 text-primary" />
                </div>
              </div>
              
              <Progress value={(metrics.deliveries / metrics.target) * 100} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.target - metrics.deliveries} more to reach target
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard
            icon={Clock}
            label="On-Time Rate"
            value={`${metrics.onTime}%`}
            trend="+2%"
            trendUp
          />
          <StatCard
            icon={Timer}
            label="Avg. Delivery"
            value={`${metrics.avgTime}m`}
            trend="-0.5m"
            trendUp
          />
          <StatCard
            icon={MapPin}
            label="Distance"
            value={`${metrics.distance}km`}
            trend=""
          />
          <StatCard
            icon={Zap}
            label="Efficiency"
            value={`${metrics.efficiency}%`}
            trend="+3%"
            trendUp
          />
        </motion.div>

        {/* Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Tabs defaultValue="hourly" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="hourly" className="flex-1">Hourly</TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
              <TabsTrigger value="breakdown" className="flex-1">Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="hourly" className="mt-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Hourly Performance</CardTitle>
                  <CardDescription>Deliveries vs target by hour</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="deliveries"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorDeliveries)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Weekly Overview</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="deliveries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="skipped" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Delivery Status</CardTitle>
                  <CardDescription>Today's breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="h-40 w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {statusBreakdown.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          <span className="text-sm font-medium ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AchievementBadge
                icon={TrendingUp}
                title={`${metrics.streak} Day Streak`}
                description="Consecutive days with 90%+ on-time"
                unlocked
              />
              <AchievementBadge
                icon={Target}
                title="Target Crusher"
                description="Exceeded daily target 5 days this week"
                unlocked
              />
              <AchievementBadge
                icon={Truck}
                title={`Rank #${metrics.rank}`}
                description="Top performer in your region"
                unlocked
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ icon: Icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px]",
                trendUp ? "text-success" : "text-destructive"
              )}
            >
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AchievementBadgeProps {
  icon: React.ElementType;
  title: string;
  description: string;
  unlocked: boolean;
}

function AchievementBadge({ icon: Icon, title, description, unlocked }: AchievementBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg",
      unlocked ? "bg-primary/10" : "bg-muted opacity-50"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        unlocked ? "bg-primary/20" : "bg-muted"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          unlocked ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {unlocked && (
        <CheckCircle2 className="w-5 h-5 text-success ml-auto" />
      )}
    </div>
  );
}

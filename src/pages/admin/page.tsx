import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Radio, FileText, Building2, Loader2 } from 'lucide-react';
import { UserGrowthChart } from '@/components/admin/analytics/UserGrowthChart';
import { SessionActivityChart } from '@/components/admin/analytics/SessionActivityChart';
import { EventDistributionChart } from '@/components/admin/analytics/EventDistributionChart';

interface DashboardMetrics {
  total_users: number;
  active_sessions: number;
  events_today: number;
  total_workspaces: number;
  system_admins: number;
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon
}: {
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value !== undefined ? (
          <>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');

      if (error) throw error;
      return data as DashboardMetrics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load dashboard metrics'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please ensure you have system_admin role and the database functions are deployed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System administration and monitoring
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={metrics?.total_users}
          description="Registered users"
          icon={Users}
        />
        <StatsCard
          title="Active Sessions"
          value={metrics?.active_sessions}
          description="Currently active driver sessions"
          icon={Radio}
        />
        <StatsCard
          title="Events Today"
          value={metrics?.events_today}
          description="Mod4 events recorded today"
          icon={FileText}
        />
        <StatsCard
          title="Workspaces"
          value={metrics?.total_workspaces}
          description="Active workspaces"
          icon={Building2}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <UserGrowthChart days={30} />
        <SessionActivityChart days={30} />
      </div>

      {/* Event Distribution */}
      <EventDistributionChart days={7} />

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Admins</CardTitle>
          <CardDescription>Users with system administrator privileges</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics?.system_admins !== undefined ? (
            <div className="flex items-center gap-2">
              <div className="text-4xl font-bold">{metrics.system_admins}</div>
              <span className="text-sm text-muted-foreground">system administrators</span>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

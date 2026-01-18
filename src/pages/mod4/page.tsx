import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  MapPin,
  Users,
  Package,
  Activity,
  Wifi,
  WifiOff,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  activeDrivers: number;
  activeSessions: number;
  pendingDeliveries: number;
  completedToday: number;
}

export default function Mod4Dashboard() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState<DashboardStats>({
    activeDrivers: 0,
    activeSessions: 0,
    pendingDeliveries: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch active sessions count
        const { count: sessionsCount } = await supabase
          .from('driver_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch today's completed deliveries from mod4_events
        const today = new Date().toISOString().split('T')[0];
        const { count: completedCount } = await supabase
          .from('mod4_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'delivery_completed')
          .gte('captured_at', `${today}T00:00:00`);

        setStats({
          activeDrivers: sessionsCount || 0,
          activeSessions: sessionsCount || 0,
          pendingDeliveries: 0, // Will be populated when batch integration is complete
          completedToday: completedCount || 0,
        });
      } catch (error) {
        console.error('Failed to fetch Mod4 stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const quickActions = [
    {
      title: 'Driver View',
      description: 'Start delivery execution as a driver',
      icon: Truck,
      href: '/mod4/driver',
      color: 'text-blue-500',
    },
    {
      title: 'Live Tracking',
      description: 'Monitor driver positions in real-time',
      icon: MapPin,
      href: '/mod4/dispatcher',
      color: 'text-green-500',
    },
    {
      title: 'Active Sessions',
      description: 'View and manage driver sessions',
      icon: Users,
      href: '/mod4/sessions',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mod4 Dashboard</h1>
          <p className="text-muted-foreground">
            Mobile driver execution and real-time tracking
          </p>
        </div>
        <Badge
          variant={isOnline ? 'default' : 'secondary'}
          className="flex items-center gap-1.5"
        >
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">
              Currently on the road
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              GPS tracking enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Deliveries finalized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.href}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(action.href)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Mod4 mobile execution platform status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">GPS Tracking Service</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Real-time Sync</span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? 'Connected' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Background Sync</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Service Worker</span>
              <Badge variant="outline">
                {'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

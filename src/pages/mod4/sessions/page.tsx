import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Smartphone,
  Clock,
  MapPin,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface Session {
  id: string;
  driver_id: string;
  device_id: string;
  vehicle_id: string | null;
  started_at: string;
  last_active_at: string;
  last_heartbeat_at: string | null;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  status: string;
  device_metadata: Record<string, unknown> | null;
  profile?: {
    full_name: string | null;
  };
  vehicle?: {
    license_plate: string;
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_sessions')
        .select(`
          *,
          vehicle:vehicles(license_plate)
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profile names for driver_ids (which reference auth.users)
      const driverIds = [...new Set((data || []).map((s: any) => s.driver_id))];
      let profileMap: Record<string, string> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', driverIds);
        profileMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || 'Unknown';
          return acc;
        }, {});
      }

      // Merge profile data into sessions
      const sessionsWithProfiles = (data || []).map((s: any) => ({
        ...s,
        profile: { full_name: profileMap[s.driver_id] || null },
      }));

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Subscribe to session changes
    const channel = supabase
      .channel('session_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_sessions',
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .rpc('end_driver_session', {
          p_session_id: sessionId,
          p_end_reason: 'admin_terminated'
        });

      if (error) throw error;
      fetchSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'INVALIDATED':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
  const recentSessions = sessions.filter(s => s.status !== 'ACTIVE');

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active Sessions</h1>
          <p className="text-muted-foreground">
            Manage driver sessions and device connections
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions Today</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ended Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {sessions.filter(s => s.status === 'INVALIDATED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Currently active driver sessions with GPS tracking enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">No active sessions</h3>
              <p className="text-sm text-muted-foreground">
                No drivers are currently online
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {session.vehicle?.license_plate || '--'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {(session.device_metadata as any)?.device_model || session.device_id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.started_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(session.last_heartbeat_at || session.last_active_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleEndSession(session.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Previously ended or expired sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.slice(0, 10).map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.started_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      {session.invalidated_at
                        ? format(new Date(session.invalidated_at), 'HH:mm')
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(session.started_at))}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

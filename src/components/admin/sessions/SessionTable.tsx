import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Loader2, Radio, Download } from 'lucide-react';
import { useSessions, DriverSession } from '@/hooks/admin/useSessions';
import { toCSV, downloadCSV } from '@/lib/csvExport';

const STATUS_OPTIONS = ['active', 'paused', 'completed', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function SessionTable() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string[]>(['active']);
  const { data: sessions = [], isLoading } = useSessions({ status: statusFilter });

  const exportToCSV = () => {
    const csv = toCSV(
      sessions.map((s) => ({
        id: s.id,
        driver: s.driver?.full_name || 'Unknown',
        vehicle: s.vehicle?.plate_number || 'N/A',
        status: s.status,
        started_at: new Date(s.started_at).toLocaleString(),
        ended_at: s.ended_at ? new Date(s.ended_at).toLocaleString() : 'Ongoing',
        distance_km: s.total_distance_km?.toFixed(2) || '0',
      }))
    );
    downloadCSV(csv, `sessions-${new Date().toISOString()}.csv`);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter by Status
              {statusFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {statusFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {STATUS_OPTIONS.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilter.includes(status)}
                onCheckedChange={() => toggleStatusFilter(status)}
              >
                <Badge className={STATUS_COLORS[status]} variant="secondary">
                  {status}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        <Button variant="outline" onClick={exportToCSV} disabled={sessions.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Active Sessions Indicator */}
      {statusFilter.includes('active') && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Radio className="h-4 w-4 animate-pulse" />
          <span>
            {sessions.filter((s) => s.status === 'active').length} active sessions
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No sessions found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session: DriverSession) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/sessions/${session.id}`)}
                >
                  <TableCell className="font-medium">
                    {session.driver?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {session.vehicle?.plate_number || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[session.status]} variant="secondary">
                      {session.status === 'active' && (
                        <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
                      )}
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(session.started_at).toLocaleString()}</TableCell>
                  <TableCell>{formatDuration(session.started_at, session.ended_at)}</TableCell>
                  <TableCell>
                    {session.total_distance_km?.toFixed(2) || '0'} km
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

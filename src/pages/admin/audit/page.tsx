import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileText,
  Search,
  Filter,
  X,
  Info,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  useAuditLogs,
  exportAuditLogsToCSV,
  useIsSystemAdmin,
  type AuditLogFilters,
} from '@/hooks/rbac';
import { format, parseISO, subDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const SEVERITY_CONFIG = {
  low: {
    label: 'Low',
    variant: 'outline' as const,
    icon: Info,
    color: 'text-muted-foreground',
  },
  medium: {
    label: 'Medium',
    variant: 'secondary' as const,
    icon: FileText,
    color: 'text-blue-500',
  },
  high: {
    label: 'High',
    variant: 'default' as const,
    icon: AlertTriangle,
    color: 'text-orange-500',
  },
  critical: {
    label: 'Critical',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-red-500',
  },
};

export default function AuditLogViewerPageNew() {
  const { toast } = useToast();
  const isAdmin = useIsSystemAdmin();

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 100,
    offset: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedResource, setSelectedResource] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch logs
  const { data: logsData, isLoading } = useAuditLogs({
    ...filters,
    severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
    action: selectedAction === 'all' ? undefined : selectedAction,
    resourceType: selectedResource === 'all' ? undefined : selectedResource,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;

  const handleApplyFilters = () => {
    setFilters((prev) => ({ ...prev, offset: 0 }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('all');
    setSelectedAction('all');
    setSelectedResource('all');
    setDateFrom(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    setDateTo(format(new Date(), 'yyyy-MM-dd'));
    setFilters({ limit: 100, offset: 0 });
  };

  const handleExport = () => {
    try {
      exportAuditLogsToCSV({
        ...filters,
        severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
        action: selectedAction === 'all' ? undefined : selectedAction,
        resourceType: selectedResource === 'all' ? undefined : selectedResource,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      });
      toast({
        title: 'Export started',
        description: 'Your audit logs are being exported to CSV',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Extract unique values for filters
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));
  const uniqueResources = Array.from(new Set(logs.map((l) => l.resource_type)));

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to view audit logs. Only system administrators can access
            this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Complete audit trail of all system actions and state changes
          </p>
        </div>
        <Button onClick={handleExport} disabled={logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <CardDescription>Narrow down audit logs by various criteria</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.slice(0, 20).map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resource Type */}
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {uniqueResources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleApplyFilters} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Audit Logs
              <Badge variant="secondary" className="ml-2">
                {total} total
              </Badge>
            </CardTitle>
            {isLoading && <Skeleton className="h-4 w-20" />}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => {
                const severityConfig = SEVERITY_CONFIG[log.severity];
                const SeverityIcon = severityConfig.icon;

                return (
                  <Dialog key={log.id}>
                    <DialogTrigger asChild>
                      <button className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <SeverityIcon className={`h-4 w-4 shrink-0 ${severityConfig.color}`} />
                              <span className="font-medium truncate">{log.action}</span>
                              <Badge variant={severityConfig.variant} className="text-xs shrink-0">
                                {severityConfig.label}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <div className="text-muted-foreground">
                                <span className="font-medium">Resource:</span> {log.resource_type}
                              </div>
                              <div className="text-muted-foreground truncate">
                                <span className="font-medium">ID:</span> {log.resource_id}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium">User:</span> {log.user_email || 'System'}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium">Time:</span>{' '}
                                {format(parseISO(log.created_at), 'PPp')}
                              </div>
                            </div>
                          </div>
                          {log.state_diff && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              Has Changes
                            </Badge>
                          )}
                        </div>
                      </button>
                    </DialogTrigger>

                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription>
                          {log.resource_type} · {format(parseISO(log.created_at), 'PPpp')}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Action</p>
                            <p className="text-sm">{log.action}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Severity</p>
                            <Badge variant={severityConfig.variant}>{severityConfig.label}</Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Resource Type
                            </p>
                            <p className="text-sm">{log.resource_type}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                            <p className="text-sm font-mono text-xs truncate">{log.resource_id}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">User</p>
                            <p className="text-sm">{log.user_email || 'System'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                            <p className="text-sm">{format(parseISO(log.created_at), 'PPpp')}</p>
                          </div>
                        </div>

                        {/* State Diff */}
                        {log.state_diff && (
                          <div>
                            <p className="text-sm font-medium mb-2">State Changes</p>
                            <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                              <pre className="text-xs font-mono">
                                {JSON.stringify(log.state_diff, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {log.metadata && (
                          <div>
                            <p className="text-sm font-medium mb-2">Additional Metadata</p>
                            <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                              <pre className="text-xs font-mono">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {log.description && (
                          <div>
                            <p className="text-sm font-medium mb-2">Description</p>
                            <p className="text-sm text-muted-foreground">{log.description}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit logs found matching your filters</p>
            </div>
          )}

          {/* Pagination Info */}
          {logs.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} of{' '}
                {total} logs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset === 0}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: prev.offset - prev.limit }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset + filters.limit >= total}
                  onClick={() => setFilters((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

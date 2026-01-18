import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, Loader2, Download, Calendar as CalendarIcon, Eye } from 'lucide-react';
import {
  useAuditLogs,
  AuditEvent,
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_COLORS,
} from '@/hooks/admin/useAuditLogs';
import { toCSV, downloadCSV, downloadJSON } from '@/lib/csvExport';
import { format } from 'date-fns';

export function AuditLogTable() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const { data: events = [], isLoading } = useAuditLogs({
    eventTypes: eventTypeFilter.length > 0 ? eventTypeFilter : undefined,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
  });

  const exportToCSV = () => {
    const csv = toCSV(
      events.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        driver: e.driver?.full_name || 'N/A',
        session_id: e.session_id || 'N/A',
        created_at: new Date(e.created_at).toLocaleString(),
        event_data: JSON.stringify(e.event_data),
      }))
    );
    downloadCSV(csv, `audit-logs-${new Date().toISOString()}.csv`);
  };

  const exportAsJSON = () => {
    downloadJSON(events, `audit-logs-${new Date().toISOString()}.json`);
  };

  const toggleEventTypeFilter = (type: string) => {
    setEventTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setEventTypeFilter([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = eventTypeFilter.length > 0 || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Event Type
              {eventTypeFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {eventTypeFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-64 overflow-y-auto">
            {EVENT_TYPE_OPTIONS.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={eventTypeFilter.includes(type)}
                onCheckedChange={() => toggleEventTypeFilter(type)}
              >
                {type.replace(/_/g, ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateTo ? format(dateTo, 'PP') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={events.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={exportToCSV}>
              Export as CSV
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={exportAsJSON}>
              Export as JSON
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {events.length} events
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No events found</p>
        </div>
      ) : (
        <div className="border rounded-lg max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event: AuditEvent) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-500/10 text-gray-600'}
                      variant="secondary"
                    >
                      {event.event_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.driver?.full_name || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.session_id ? event.session_id.slice(0, 8) + '...' : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.event_type.replace(/_/g, ' ')} at{' '}
              {selectedEvent && new Date(selectedEvent.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event ID</p>
                <p className="font-mono text-xs">{selectedEvent?.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                <p className="font-mono text-xs">{selectedEvent?.session_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Driver</p>
                <p>{selectedEvent?.driver?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Type</p>
                <Badge
                  className={
                    selectedEvent
                      ? EVENT_TYPE_COLORS[selectedEvent.event_type] || 'bg-gray-500/10 text-gray-600'
                      : ''
                  }
                  variant="secondary"
                >
                  {selectedEvent?.event_type.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Event Data</p>
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-64">
                {selectedEvent && JSON.stringify(selectedEvent.event_data, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

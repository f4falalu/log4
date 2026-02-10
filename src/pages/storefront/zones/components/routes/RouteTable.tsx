import { useState } from 'react';
import { Search, MoreHorizontal, Eye, Pencil, Lock, Trash2, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoutes, useDeleteRoute, useLockRoute } from '@/hooks/useRoutes';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import type { Route } from '@/types/routes';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const modeLabels: Record<string, string> = {
  facility_list: 'Facility List',
  upload: 'Upload',
  sandbox: 'Sandbox',
};

interface RouteTableProps {
  onViewDetail: (route: Route) => void;
}

export function RouteTable({ onViewDetail }: RouteTableProps) {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { zones } = useOperationalZones();
  const { data: routes, isLoading } = useRoutes({
    zone_id: zoneFilter !== 'all' ? zoneFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  });
  const deleteMutation = useDeleteRoute();
  const lockMutation = useLockRoute();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleLock = (id: string) => {
    if (confirm('Lock this route? Locked routes cannot be modified or deleted.')) {
      lockMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones?.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Service Area</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-center">Facilities</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : routes && routes.length > 0 ? (
              routes.map((route) => (
                <TableRow
                  key={route.id}
                  className="cursor-pointer"
                  onClick={() => onViewDetail(route)}
                >
                  <TableCell className="font-medium">
                    {route.name}
                    {route.is_sandbox && (
                      <Badge variant="outline" className="ml-2 text-xs">Sandbox</Badge>
                    )}
                  </TableCell>
                  <TableCell>{route.zones?.name || '—'}</TableCell>
                  <TableCell>{route.service_areas?.name || '—'}</TableCell>
                  <TableCell>{route.warehouses?.name || '—'}</TableCell>
                  <TableCell className="text-center">{route.facility_count || 0}</TableCell>
                  <TableCell>
                    {route.total_distance_km ? `${route.total_distance_km} km` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[route.status] || ''}>
                      {route.status === 'locked' && <Lock className="mr-1 h-3 w-3" />}
                      {route.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{modeLabels[route.creation_mode] || route.creation_mode}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(route); }}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {route.status !== 'locked' && !route.is_sandbox && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLock(route.id); }}>
                              <Lock className="mr-2 h-4 w-4" /> Lock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(route.id); }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {route.is_sandbox && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(route.id); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No routes found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

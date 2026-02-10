import { useState } from 'react';
import { Search, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServiceAreas, useDeleteServiceArea } from '@/hooks/useServiceAreas';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { ServiceArea } from '@/types/service-areas';

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const serviceTypeLabels: Record<string, string> = {
  general: 'General',
  arv: 'ARV',
  epi: 'EPI',
  mixed: 'Mixed',
};

interface ServiceAreaTableProps {
  onViewDetail: (sa: ServiceArea) => void;
  onEdit: (sa: ServiceArea) => void;
}

export function ServiceAreaTable({ onViewDetail, onEdit }: ServiceAreaTableProps) {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { zones } = useOperationalZones();
  const { data: serviceAreas, isLoading } = useServiceAreas({
    zone_id: zoneFilter !== 'all' ? zoneFilter : undefined,
    service_type: typeFilter !== 'all' ? typeFilter : undefined,
    search: search || undefined,
  });
  const deleteMutation = useDeleteServiceArea();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this service area?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search service areas..."
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="arv">ARV</SelectItem>
            <SelectItem value="epi">EPI</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
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
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Facilities</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
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
            ) : serviceAreas && serviceAreas.length > 0 ? (
              serviceAreas.map((sa) => (
                <TableRow
                  key={sa.id}
                  className="cursor-pointer"
                  onClick={() => onViewDetail(sa)}
                >
                  <TableCell className="font-medium">{sa.name}</TableCell>
                  <TableCell>{sa.zones?.name || '—'}</TableCell>
                  <TableCell>{sa.warehouses?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {serviceTypeLabels[sa.service_type] || sa.service_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{sa.facility_count || 0}</TableCell>
                  <TableCell>
                    <Badge className={priorityColors[sa.priority] || ''}>
                      {sa.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{sa.delivery_frequency || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={sa.is_active ? 'default' : 'secondary'}>
                      {sa.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(sa); }}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(sa); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(sa.id); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No service areas found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

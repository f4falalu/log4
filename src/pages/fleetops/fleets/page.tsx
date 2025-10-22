import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { PanelDrawer } from '@/components/shared/PanelDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFleets, useCreateFleet, useUpdateFleet, useDeleteFleet } from '@/hooks/useFleets';
import { useVendors } from '@/hooks/useVendors';
import { Building2, MapPin, Plus, Trash2, Edit, LayoutList } from 'lucide-react';
import { toast } from 'sonner';

interface FleetRow {
  id: string;
  name: string;
  vendor_name?: string | null;
  service_area?: string | null;
  zone?: string | null;
  vehicle_count?: number;
  status?: 'active' | 'inactive' | 'maintenance' | string;
}

const statusClass = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-700 border-transparent';
    case 'maintenance':
      return 'bg-amber-500/10 text-amber-700 border-transparent';
    case 'inactive':
      return 'bg-secondary text-secondary-foreground border-transparent';
    default:
      return 'bg-secondary text-secondary-foreground border-transparent';
  }
};

export default function FleetsPage() {
  const { data: fleets = [] } = useFleets();
  const { data: vendors = [] } = useVendors();
  const createFleet = useCreateFleet();
  const updateFleet = useUpdateFleet();
  const deleteFleet = useDeleteFleet();
  const [selected, setSelected] = useState<FleetRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    vendor_id: '',
    status: 'active' as 'active' | 'inactive',
    mission: ''
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Fleet name is required');
      return;
    }
    await createFleet.mutateAsync(formData);
    setIsCreating(false);
    setFormData({ name: '', vendor_id: '', status: 'active', mission: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this fleet?')) {
      await deleteFleet.mutateAsync(id);
      setSelected(null);
    }
  };

  const columns: ColumnDef<FleetRow>[] = [
    {
      accessorKey: 'name',
      header: 'Fleet',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'vendor_name',
      header: 'Vendor',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.vendor_name || '-'}</span>
        </div>
      )
    },
    {
      id: 'service',
      header: 'Service Area / Zone',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{row.original.service_area || '-'}{row.original.zone ? ` • ${row.original.zone}` : ''}</span>
        </div>
      )
    },
    {
      accessorKey: 'vehicle_count',
      header: 'Vehicles',
      cell: ({ row }) => <span>{row.original.vehicle_count ?? 0}</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={statusClass(row.original.status)}>
          {row.original.status || 'active'}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelected(row.original)}>
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fleets</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{fleets.length} fleet{fleets.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Fleet
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={fleets as FleetRow[]}
        title="Fleet Overview"
        description="Manage fleet groups and assignments"
      />

      {selected && (
        <PanelDrawer
          title={selected.name}
          description="Fleet details"
          trigger={<div />}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="text-operational">{selected.vendor_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Service Area / Zone</p>
                      <p className="text-operational">{selected.service_area || '-'} {selected.zone ? `• ${selected.zone}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicles</p>
                      <p className="text-operational">{selected.vehicle_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={statusClass(selected.status)}>{selected.status || 'active'}</Badge>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Fleet
                  </Button>
                </div>
              )
            }
          ]}
          side="right"
          onClose={() => setSelected(null)}
        />
      )}

      {isCreating && (
        <PanelDrawer
          title="New Fleet"
          description="Create a new fleet"
          trigger={<div />}
          tabs={[
            {
              id: 'form',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <Label>Fleet Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Main Fleet"
                    />
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v: 'active' | 'inactive') => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mission</Label>
                    <Textarea
                      value={formData.mission}
                      onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                      placeholder="Describe fleet purpose..."
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={createFleet.isPending}>
                    {createFleet.isPending ? 'Creating...' : 'Create Fleet'}
                  </Button>
                </div>
              )
            }
          ]}
          side="right"
          onClose={() => {
            setIsCreating(false);
            setFormData({ name: '', vendor_id: '', status: 'active', mission: '' });
          }}
        />
      )}
    </div>
  );
}

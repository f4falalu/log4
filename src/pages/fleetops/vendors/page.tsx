import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { PanelDrawer } from '@/components/shared/PanelDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors';
import { Building, Phone, Mail, MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface VendorRow {
  id: string;
  name: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  status?: 'active' | 'inactive' | string;
  fleets_count?: number;
}

const statusClass = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-700 border-transparent';
    case 'inactive':
      return 'bg-secondary text-secondary-foreground border-transparent';
    default:
      return 'bg-secondary text-secondary-foreground border-transparent';
  }
};

export default function VendorsPage() {
  const { data: vendors = [] } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    address: ''
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    await createVendor.mutateAsync(formData);
    setIsCreating(false);
    setFormData({ name: '', contact_name: '', contact_phone: '', contact_email: '', address: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this vendor?')) {
      await deleteVendor.mutateAsync(id);
      setSelected(null);
    }
  };

  const columns: ColumnDef<VendorRow>[] = [
    {
      accessorKey: 'name',
      header: 'Vendor',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      )
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          {row.original.contact_name && <div>{row.original.contact_name}</div>}
          <div className="flex gap-3 text-muted-foreground">
            {row.original.contact_phone && (
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3"/>{row.original.contact_phone}</span>
            )}
            {row.original.contact_email && (
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{row.original.contact_email}</span>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate max-w-[320px]">{row.original.address || '-'}</span>
        </div>
      )
    },
    {
      accessorKey: 'fleets_count',
      header: 'Fleets',
      cell: ({ row }) => <span>{row.original.fleets_count ?? 0}</span>
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
          <h1 className="text-xl font-semibold tracking-tight">Vendors</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Vendor
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={vendors as VendorRow[]}
        title="Vendor Directory"
        description="Manage vendor relationships and contacts"
      />

      {selected && (
        <PanelDrawer
          title={selected.name}
          description="Vendor details"
          trigger={<div />}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <div className="space-y-1">
                        {selected.contact_name && <p className="text-operational">{selected.contact_name}</p>}
                        <div className="flex gap-3 text-muted-foreground text-sm">
                          {selected.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3"/>{selected.contact_phone}</span>}
                          {selected.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{selected.contact_email}</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="text-operational">{selected.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fleets</p>
                      <p className="text-operational">{selected.fleets_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={statusClass(selected.status)}>{selected.status || 'active'}</Badge>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Vendor
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
          title="New Vendor"
          description="Add a new vendor"
          trigger={<div />}
          tabs={[
            {
              id: 'form',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <Label>Vendor Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., BIKO Logistics"
                    />
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Primary contact person"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+234-800-XXXX-XXX"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="contact@vendor.com"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street, City, Country"
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={createVendor.isPending}>
                    {createVendor.isPending ? 'Creating...' : 'Create Vendor'}
                  </Button>
                </div>
              )
            }
          ]}
          side="right"
          onClose={() => {
            setIsCreating(false);
            setFormData({ name: '', contact_name: '', contact_phone: '', contact_email: '', address: '' });
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Search, Filter, Eye, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useRequisitions, useCreateRequisition, useUpdateRequisition, useDeleteRequisition } from '@/hooks/useRequisitions';
import { useFacilities } from '@/hooks/useFacilities';
import { RequisitionForm } from '@/components/requisition/RequisitionForm';
import { RequisitionDetail } from '@/components/requisition/RequisitionDetail';
import { ApprovalActions } from '@/components/requisition/ApprovalActions';

export default function RequisitionsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    facility_id: 'all',
    requisition_type: 'all'
  });

  const { data: facilities = [] } = useFacilities();
  const { data: requisitions = [], isLoading } = useRequisitions(filters);
  const createRequisitionMutation = useCreateRequisition();
  const updateRequisitionMutation = useUpdateRequisition();
  const deleteRequisitionMutation = useDeleteRequisition();

  // Filter requisitions based on search and active tab
  const filteredRequisitions = requisitions.filter(req => {
    const matchesSearch = req.requisition_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.facility?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && req.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-700 border-transparent';
      case 'pending': return 'bg-amber-500/10 text-amber-700 border-transparent';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-transparent';
      case 'completed': return 'bg-blue-500/10 text-blue-700 border-transparent';
      default: return 'bg-secondary text-secondary-foreground border-transparent';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'emergency'
      ? 'bg-red-500/10 text-red-700 border-transparent'
      : 'bg-purple-500/10 text-purple-700 border-transparent';
  };

  const handleCreateRequisition = async (data: any) => {
    try {
      await createRequisitionMutation.mutateAsync(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Create requisition error:', error);
    }
  };

  const handleViewDetails = (requisition: any) => {
    setSelectedRequisition(requisition);
    setIsDetailDialogOpen(true);
  };

  const handleApproval = async (requisitionId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await updateRequisitionMutation.mutateAsync({
        id: requisitionId,
        data: {
          status,
          rejection_reason: reason,
          approved_by: 'current-user' // This would be the actual user ID in production
        }
      });
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  const handleDelete = async (requisitionId: string) => {
    if (confirm('Are you sure you want to delete this requisition?')) {
      try {
        await deleteRequisitionMutation.mutateAsync(requisitionId);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  type Req = {
    id: string;
    requisition_number: string;
    facility?: { name: string; type?: string } | null;
    requisition_type: 'routine' | 'emergency';
    total_items: number;
    total_weight: number;
    total_volume: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
    expected_delivery_date?: string | null;
    created_at: string;
  };

  const columns: ColumnDef<Req>[] = [
    {
      accessorKey: 'requisition_number',
      header: 'Requisition #',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.requisition_number}</span>
      ),
    },
    {
      accessorKey: 'facility',
      header: 'Facility',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.facility?.name || '-'}</div>
          <div className="text-sm text-muted-foreground">{row.original.facility?.type || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'requisition_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge className={getTypeColor(row.original.requisition_type)}>
          {row.original.requisition_type === 'emergency' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {row.original.requisition_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: 'total_items',
      header: 'Items',
      cell: ({ row }) => <div className="text-center">{row.original.total_items}</div>,
    },
    {
      id: 'weight_volume',
      header: 'Total Weight/Volume',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.total_weight.toFixed(1)} kg</div>
          <div className="text-muted-foreground">{row.original.total_volume.toFixed(2)} m³</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {getStatusIcon(row.original.status)}
          <span className="ml-1">{row.original.status.toUpperCase()}</span>
        </Badge>
      ),
    },
    {
      accessorKey: 'expected_delivery_date',
      header: 'Expected Delivery',
      cell: ({ row }) => (
        row.original.expected_delivery_date
          ? new Date(row.original.expected_delivery_date).toLocaleDateString()
          : '-'
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRequisition(row.original);
              setIsDetailDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statusCounts = {
    all: requisitions.length,
    draft: requisitions.filter(r => r.status === 'draft').length,
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
    completed: requisitions.filter(r => r.status === 'completed').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Loading requisitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Requisition Management</h1>
          <p className="text-muted-foreground">Manage facility supply requests and approvals</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Requisition</DialogTitle>
              <DialogDescription>
                Submit a new supply requisition for facility approval
              </DialogDescription>
            </DialogHeader>
            <RequisitionForm
              facilities={facilities}
              onSubmit={handleCreateRequisition}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createRequisitionMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{statusCounts.all}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{statusCounts.draft}</p>
              <p className="text-sm text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Facility:</Label>
              <Select value={filters.facility_id} onValueChange={(value) => setFilters({...filters, facility_id: value})}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map(facility => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <Select value={filters.requisition_type} onValueChange={(value) => setFilters({...filters, requisition_type: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({statusCounts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={filteredRequisitions as Req[]}
            title="Requisitions"
            description={`${filteredRequisitions.length} requisition${filteredRequisitions.length !== 1 ? 's' : ''} found`}
          />
        </TabsContent>
      </Tabs>

      {/* Requisition Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>
              View complete requisition information and items
            </DialogDescription>
          </DialogHeader>
          {selectedRequisition && (
            <RequisitionDetail
              requisition={selectedRequisition}
              onClose={() => setIsDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

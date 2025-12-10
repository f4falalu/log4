import { useState } from 'react';
import { Plus, Eye, Check, X, Trash2, Filter, FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { TableLoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequisitions, useUpdateRequisitionStatus, useDeleteRequisition } from '@/hooks/useRequisitions';
import { Requisition, RequisitionStatus } from '@/types/requisitions';
import { RequisitionTypeDialog } from './RequisitionTypeDialog';
import { CreateRequisitionDialog } from './CreateRequisitionDialog';
import { UploadRequisitionDialog } from './UploadRequisitionDialog';
import { RequisitionDetailsDialog } from './RequisitionDetailsDialog';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function RequisitionsPage() {
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requisitionToDelete, setRequisitionToDelete] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requisitions = [], isLoading } = useRequisitions(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const updateStatus = useUpdateRequisitionStatus();
  const deleteRequisition = useDeleteRequisition();

  const getStatusColor = (status: RequisitionStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'fulfilled': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'default';
      case 'urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: 'approved' });
  };

  const handleReject = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedRequisition) {
      updateStatus.mutate({
        id: selectedRequisition.id,
        status: 'rejected',
        rejection_reason: rejectionReason
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRequisition(null);
    }
  };

  const handleFulfill = (id: string) => {
    updateStatus.mutate({ id, status: 'fulfilled' });
  };

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setDetailsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setRequisitionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (requisitionToDelete) {
      deleteRequisition.mutate(requisitionToDelete);
      setDeleteDialogOpen(false);
      setRequisitionToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Requisitions</h1>
          <p className="text-muted-foreground mt-2">
            Manage delivery requisitions and approval workflow
          </p>
        </div>
        <Button onClick={() => setTypeDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Requisition
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requisition List</CardTitle>
              <CardDescription>View and manage all requisitions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RequisitionStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableLoadingState message="Loading requisitions..." />
          ) : requisitions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No requisitions found"
              description={
                statusFilter === 'all'
                  ? 'Get started by creating your first delivery requisition.'
                  : `No requisitions with status "${statusFilter}".`
              }
              action={
                statusFilter === 'all' && (
                  <Button onClick={() => setTypeDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Requisition
                  </Button>
                )
              }
              variant="dashed"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition #</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.requisition_number}
                    </TableCell>
                    <TableCell>{req.facility?.name || 'N/A'}</TableCell>
                    <TableCell>{req.warehouse?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {format(new Date(req.requested_delivery_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(req.priority)}>
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {req.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReject(req)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFulfill(req.id)}
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(req.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RequisitionTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onSelectManual={() => setCreateDialogOpen(true)}
        onSelectUpload={() => setUploadDialogOpen(true)}
      />

      <CreateRequisitionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <UploadRequisitionDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {selectedRequisition && (
        <RequisitionDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          requisition={selectedRequisition}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requisition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this requisition? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this requisition.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

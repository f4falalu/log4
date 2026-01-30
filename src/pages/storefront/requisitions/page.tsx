import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { useRequisitions, useUpdateRequisitionStatus } from '@/hooks/useRequisitions';
import { useWarehouses } from '@/hooks/useWarehouses';
import type { Requisition } from '@/types/requisitions';
import { RequisitionsLayout } from './components/RequisitionsLayout';
import { RequisitionsHeader } from './components/RequisitionsHeader';
import { RequisitionsListView } from './components/RequisitionsListView';
import { RequisitionSummaryStrip } from './components/RequisitionSummaryStrip';
import { RequisitionDetailPanel } from './components/RequisitionDetailPanel';
import { NewRequisitionWizard } from './components/NewRequisitionWizard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function RequisitionsPage() {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Selection state
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState<string[]>(['pending', 'approved']);

  // Dialog state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Data fetching
  const { data: requisitions = [], isLoading } = useRequisitions();
  const { data: warehousesData } = useWarehouses();
  const updateStatus = useUpdateRequisitionStatus();

  const warehouses = warehousesData?.warehouses || [];

  // Filter requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          req.requisition_number?.toLowerCase().includes(search) ||
          req.sriv_number?.toLowerCase().includes(search) ||
          req.facility?.name?.toLowerCase().includes(search) ||
          req.program?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Warehouse filter
      if (warehouseFilter !== 'all' && req.warehouse_id !== warehouseFilter) {
        return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const reqDate = new Date(req.requested_delivery_date);
        if (reqDate < dateRange.from) return false;
        if (dateRange.to && reqDate > dateRange.to) return false;
      }

      return true;
    });
  }, [requisitions, searchTerm, warehouseFilter, dateRange]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (warehouseFilter !== 'all') count++;
    if (dateRange?.from) count++;
    return count;
  }, [searchTerm, warehouseFilter, dateRange]);

  // Handlers
  const handleRequisitionClick = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedRequisition(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setWarehouseFilter('all');
    setDateRange(undefined);
  };

  const handleReject = () => {
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedRequisition && rejectionReason.trim()) {
      updateStatus.mutate({
        id: selectedRequisition.id,
        status: 'rejected',
        rejection_reason: rejectionReason,
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setIsDetailOpen(false);
      setSelectedRequisition(null);
    }
  };

  return (
    <>
      <RequisitionsLayout
        header={
          <RequisitionsHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            warehouseFilter={warehouseFilter}
            onWarehouseChange={setWarehouseFilter}
            warehouses={warehouses.map(w => ({ id: w.id, name: w.name }))}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onNewRequisition={() => setIsWizardOpen(true)}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />
        }
        content={
          <RequisitionsListView
            requisitions={filteredRequisitions}
            isLoading={isLoading}
            onRequisitionClick={handleRequisitionClick}
            selectedRequisitionId={selectedRequisition?.id}
            openAccordions={openAccordions}
            onAccordionsChange={setOpenAccordions}
          />
        }
        summary={
          <RequisitionSummaryStrip requisitions={filteredRequisitions} />
        }
      >
        {/* Detail Panel */}
        {isDetailOpen && selectedRequisition && (
          <RequisitionDetailPanel
            requisition={selectedRequisition}
            onClose={handleCloseDetail}
            onReject={handleReject}
          />
        )}
      </RequisitionsLayout>

      {/* New Requisition Wizard */}
      <NewRequisitionWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />

      {/* Rejection Dialog */}
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
                disabled={!rejectionReason.trim() || updateStatus.isPending}
              >
                {updateStatus.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
